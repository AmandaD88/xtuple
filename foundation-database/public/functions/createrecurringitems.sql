CREATE OR REPLACE FUNCTION createRecurringItems(INTEGER, TEXT) RETURNS INTEGER AS $$
-- Copyright (c) 1999-2014 by OpenMFG LLC, d/b/a xTuple. 
-- See www.xtuple.com/CPAL for the full text of the software license.
DECLARE
  pParentid  ALIAS FOR $1;      -- if NULL then all items with the given pType
  pType      TEXT := UPPER($2); -- if NULL then all types
                                -- if both are null then all items of all types
  _wherebase TEXT;
  _doneclause TEXT;
  _pastclause TEXT;
  _lastbase TEXT;
  _where TEXT;
  _wheredone TEXT;
  _wherepast TEXT;
  _copystmt  TEXT;
  _maxpaststmt TEXT;
  _updatebase TEXT;
  _updatestmt TEXT;
  _lastclause TEXT := '';
  _wherelast TEXT := '';
  _lastpast TEXT;
  _delcnt    INTEGER;
  _predelstmt TEXT;
  _delstmt   TEXT;
  _count     INTEGER := 0;
  _countstmt TEXT;
  _existcnt  INTEGER;
  _id        INTEGER;
  _interval  TEXT;
  _last      TIMESTAMP WITH TIME ZONE;
  _loopcount INTEGER := 1;
  _maxstmt   TEXT;
  _maxdate   TIMESTAMP WITH TIME ZONE := endOfTime();
  _result    INTEGER := 0;
  _next      TIMESTAMP WITH TIME ZONE;
  _r         RECORD;
  _rt        RECORD;
  _tmp       INTEGER;

BEGIN
  RAISE DEBUG 'createRecurringItems(%, %) entered', pParentid, pType;

  SELECT * INTO _rt FROM recurtype WHERE (UPPER(recurtype_type)=UPPER(pType));
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF (_count <= 0) THEN
    RETURN -10;
  END IF;

  -- build statements dynamically from the recurtype table because packages
  -- might also require recurring items. this way the algorithm is fixed
  -- and the details are data-driven

  _wherebase   := format(
                         $f$
                           WHERE ((%%%%L=%I_recurring_%I_id)
                           AND (%s)
                           %%s
                           %%s
                           %%s);
                         $f$,
                         REGEXP_REPLACE(_rt.recurtype_table, E'.*\\.', ''),
                         REGEXP_REPLACE(_rt.recurtype_table, E'.*\\.', ''),
                         COALESCE(_rt.recurtype_limit, 'TRUE')
                        );

  _doneclause  := format(
                         $f$
                           AND NOT(%s)
                         $f$,
                         _rt.recurtype_donecheck
                        );

  _pastclause  := format(
                         $f$
                           AND (%I<date_trunc('minute', now()))
                         $f$,
                         _rt.recurtype_schedcol
                        );

  _lastbase    := format(
                         $f$
                           AND %I=%%L
                         $f$,
                         _rt.recurtype_schedcol
                        );

  _where       := format(_wherebase, '', '', '');
  _wheredone   := format(_wherebase, _doneclause, '', '');
  _wherepast   := format(_wherebase, _doneclause, _pastclause, '');

  _countstmt   := format(
                         $f$
                           SELECT COUNT(*) FROM %I
                           %s
                         $f$,
                         _rt.recurtype_table,
                         _wheredone
                        );

  _maxstmt     := format(
                         $f$
                           SELECT MAX(%I) FROM %I'
                            %s%
                         $f$,
                         _rt.recurtype_schedcol,
                         _rt.recurtype_table,
                         _wheresimple
                        );

  _copystmt    := format(
                         $f$
                           SELECT %s(%%L, %s %s);
                         $f$,
                         _rt.recurtype_copyfunc,
                         CASE WHEN UPPER(_rt.recurtype_copyargs[2])='DATE' THEN
                           'CAST(%%L AS DATE)'
                         ELSE
                           '%%L'
                         END,
                         REPEAT(',NULL',
                                CAST(REPLACE(REGEXP_REPLACE(ARRAY_DIMS(_rt.recurtype_copyargs),
                                                            '.*:', ''), ']', '') AS INTEGER) -2)
                        );

  _maxpaststmt := format(
                         $f$
                           SELECT MAX(%I)::TEXT FROM %I
                           %s
                         $f$,
                         _rt.recurtype_schedcol,
                         _rt.recurtype_table,
                         _wherepast
                        );

  _updatebase := format(
                        $f$
                          UPDATE %I SET %I=date_trunc('minute', now())
                          %%s
                        $f$,
                        _rt.recurtype_table,
                        _rt.schedcol
                       );

  _predelstmt := format(
                        $f$
                          SELECT COUNT(*) FROM %I
                          %s
                        $f$,
                        _rt.recurtype_table,
                        _wherepast
                       );

  _delstmt    := format(
                        $f$
                          SELECT %s(%s_id) FROM %I
                          %s
                        $f$,
                        _rt.recurtype_delfunc,
                        REGEXP_REPLACE(_rt.recurtype_table, E'.*\\.', ''),
                        _rt.recurtype_table,
                        _wherepast
                       );

  FOR _r IN SELECT *
              FROM recur
             WHERE ((COALESCE(recur_end, endOfTime()) >= CURRENT_TIMESTAMP)
                AND (pParentid IS NULL OR recur_parent_id=pParentid)
                AND (pType IS NULL OR UPPER(recur_parent_type)=UPPER(pType))) LOOP

    RAISE DEBUG 'createRecurringItems looking at recur %, %',
                _r.recur_id, _r.recur_parent_type;

    IF(_r.recur_style='KeepOne') THEN
      EXECUTE _maxpaststmt INTO _lastpast;
      _lastclause := format(_lastbase, _lastpast);
    END IF;

    IF(_r.recur_style IS NOT NULL AND _r.recur_style!='KeepNone') THEN
      _wherelast  := format(_wherebase, _doneclause, _pastclause, _lastclause);
    END IF;

    _updatestmt   := format(_updatebase, _wherelast);

    _r.recur_max := COALESCE(_r.recur_max,
                             CAST(fetchMetricValue('RecurringInvoiceBuffer') AS INTEGER),
                             1);
    _interval := CASE _r.recur_period WHEN 'Y' THEN ' year'
                                      WHEN 'M' THEN ' month'
                                      WHEN 'W' THEN ' week'
                                      WHEN 'D' THEN ' day'
                                      WHEN 'H' THEN ' hour'
                                      WHEN 'm' THEN ' minute'
                                      ELSE NULL
                 END;

    IF (_interval IS NULL OR COALESCE(_r.recur_freq, 0) <= 0) THEN
      RAISE EXCEPTION 'Unknown recurrence frequency % % ON % %',
                      _r.recur_freq,        _r.recur_period,
                      _r.recur_parent_type, _r.recur_parent_id;
    END IF;

    -- if the recurrence type has a max lookahead window, use it
    IF (_r.recur_parent_type = 'I') THEN
      _maxdate := CURRENT_TIMESTAMP + CAST(fetchMetricText('RecurringInvoiceBuffer') || ' days' AS INTERVAL);
    END IF;
    IF (_r.recur_parent_type = 'V') THEN
      _maxdate := CURRENT_TIMESTAMP + CAST(fetchMetricText('RecurringVoucherBuffer') || ' days' AS INTERVAL);
    END IF;
    IF (_maxdate > _r.recur_end) THEN   -- if recur_end is null, _maxdate is ok
      _maxdate = _r.recur_end;
    END IF;

    EXECUTE format(_maxstmt, _r.recur_parent_id) INTO _last;

    IF(_updatestmt!='') THEN
      EXECUTE _updatestmt;
    END IF;

    EXECUTE format(_predelstmt, _r.recur_parent_id) INTO _delcnt;

    EXECUTE format(_countstmt, _r.recur_parent_id) INTO _existcnt;
    RAISE DEBUG E'% got %, % got %', _countstmt, _existcnt, _maxstmt, _last;

    _existcnt := _existcnt - _delcnt;
    _next := _last;
    _loopcount := 1;
    WHILE (_existcnt < _r.recur_max AND _next < _maxdate) LOOP
      _next := _last +
               CAST(_r.recur_freq * _loopcount || _interval AS INTERVAL);
      RAISE DEBUG 'createrecurringitems looping, existcnt = %, max = %, is % between % and %?',
                  _existcnt, _r.recur_max, _next, _r.recur_start, _r.recur_end;

      IF (_next BETWEEN _r.recur_start AND _maxdate AND _next >= date_trunc('minute', now())) THEN
        RAISE DEBUG 'createrecurringitems executing % with % and %',
                    _copystmt, _r.recur_parent_id, _next;
        -- 8.4+: EXECUTE _copystmt INTO _id USING _r.recur_parent_id, _next;
        EXECUTE format(_copystmt, _r.recur_parent_id, _next) INTO _id;
        RAISE DEBUG 'Copying for % returned %', _next, _id;
        _result   := _result   + 1;
        _existcnt := _existcnt + 1;
      END IF;
      _loopcount := _loopcount + 1;
    END LOOP;

    EXECUTE _delstmt;

  END LOOP;

  RETURN _result;
END;
$$ LANGUAGE 'plpgsql';
