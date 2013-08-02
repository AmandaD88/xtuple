/*jshint bitwise:true, indent:2, curly:true, eqeqeq:true, immed:true,
latedef:true, newcap:true, noarg:true, regexp:true, undef:true,
trailing:true, white:true*/
/*global XT:true, XM:true, XV:true, enyo:true*/

(function () {

  XT.extensions.inventory.initWorkspaces = function () {
    var extensions;

    // ..........................................................
    // CONFIGURE
    //

    enyo.kind({
      name: "XV.InventoryWorkspace",
      kind: "XV.Workspace",
      title: "_configure".loc() + " " + "_inventory".loc(),
      model: "XM.Inventory",
      components: [
        {kind: "Panels", arrangerKind: "CarouselArranger",
          fit: true, components: [
          {kind: "XV.Groupbox", name: "mainPanel", components: [
            {kind: "XV.ScrollableGroupbox", name: "mainGroup", fit: true,
              classes: "in-panel", components: [
              {kind: "onyx.GroupboxHeader", content: "_reporting".loc()},
              {kind: "XV.NumberWidget", attr: "DefaultEventFence",
                label: "_defaultEventFence".loc(), formatting: false},
              {kind: "onyx.GroupboxHeader", content: "_changeLog".loc()},
              {kind: "XV.ToggleButtonWidget", attr: "WarehouseChangeLog",
                label: "_postSiteChanges".loc()},
              {kind: "XV.ToggleButtonWidget", attr: "ItemSiteChangeLog",
                label: "_postItemSiteChanges".loc()},
              {kind: "onyx.GroupboxHeader", content: "_costing".loc()},
              {kind: "XV.ToggleButtonWidget", attr: "AllowAvgCostMethod",
                label: "_allowAvgCostMethod".loc()},
              {kind: "XV.ToggleButtonWidget", attr: "AllowStdCostMethod",
                label: "_allowStdCostMethod".loc()},
              {kind: "XV.ToggleButtonWidget", attr: "AllowJobCostMethod",
                label: "_allowJobCostMethod".loc()},
              {kind: "XV.PickerWidget", attr: "CountAvgCostMethod",
                label: "_countAvgCostMethod".loc(), collection: "XM.countAvgCostMethod"},
              {kind: "onyx.GroupboxHeader", content: "_physicalInventory".loc()},
              {kind: "XV.PickerWidget", attr: "PostCountTagToDefault",
                label: "_postCountTagToDefault".loc(), collection: "XM.postCountTagToDefault"},
              {kind: "XV.PickerWidget", attr: "CountSlipAuditing",
                label: "_countSlipAuditing".loc(), collection: "XM.countSlipAuditing"},
              {kind: "onyx.GroupboxHeader", content: "_shippingAndReceiving".loc()},
              {kind: "XV.NumberPolicyPicker", attr: "ShipmentNumberGeneration",
                label: "_shipmentNumberPolicy".loc()},
              {kind: "XV.NumberWidget", attr: "NextShipmentNumber",
                label: "_nextShipmentNumber".loc(), formatting: false},
              {kind: "XV.ToggleButtonWidget", attr: "KitComponentInheritCOS",
                label: "_kitComponentInheritCOS".loc()},
              {kind: "XV.ToggleButtonWidget", attr: "DisallowReceiptExcessQty",
                label: "_disableReceiptExcessQty".loc()},
              {kind: "XV.ToggleButtonWidget", attr: "WarnIfReceiptQtyDiffers",
                label: "_warnIfReceiptQtyDiffers".loc()},
              {kind: "XV.NumberWidget", attr: "ReceiptQtyTolerancePct",
                label: "_receiptQtyTolerancePct".loc(), formatting: false},
              {kind: "XV.ToggleButtonWidget", attr: "RecordPPVonReceipt",
                label: "_recordPPVOnReceipt".loc()}
            ]}
          ]}
        ]}
      ]
    });

    // ..........................................................
    // ISSUE STOCK
    //

    enyo.kind({
      name: "XV.IssueStockWorkspace",
      kind: "XV.Workspace",
      title: "_issueStock".loc(),
      model: "XM.ShippableSalesOrderLine",
      components: [
        {kind: "Panels", arrangerKind: "CarouselArranger",
          fit: true, components: [
          {kind: "XV.Groupbox", name: "mainPanel", components: [
            {kind: "onyx.GroupboxHeader", content: "_order".loc()},
            {kind: "XV.ScrollableGroupbox", name: "mainGroup",
              classes: "in-panel", fit: true, components: [
              {kind: "XV.SalesOrderWidget", attr: "order"},
              {kind: "XV.ShipmentWidget", attr: "shipment"},
              {kind: "onyx.GroupboxHeader", content: "_item".loc()},
              {kind: "XV.ItemSiteWidget", attr:
                {item: "item", site: "site"}
              },
              {kind: "XV.QuantityWidget", attr: "ordered"},
              {kind: "XV.QuantityWidget", attr: "shipped"},
              {kind: "XV.QuantityWidget", attr: "returned"},
              {kind: "XV.QuantityWidget", attr: "balance"},
              {kind: "onyx.GroupboxHeader", content: "_issue".loc()},
              {kind: "XV.QuantityWidget", attr: "toIssue"},
            ]}
          ]},
        ]}
      ]
    });

    // ..........................................................
    // SHIPMENT
    //

    enyo.kind({
      name: "XV.ShipmentWorkspace",
      kind: "XV.Workspace",
      title: "_shipment".loc(),
      model: "XM.Shipment",
      components: [
        {kind: "Panels", arrangerKind: "CarouselArranger",
          fit: true, components: [
          {kind: "XV.Groupbox", name: "mainPanel", fit: true, components: [
            {kind: "onyx.GroupboxHeader", content: "_overview".loc()},
            {kind: "XV.ScrollableGroupbox", name: "mainGroup",
              classes: "in-panel", fit: true, components: [
              {kind: "XV.InputWidget", attr: "number"},
              {kind: "XV.SalesOrderWidget", attr: "order"},
              {kind: "XV.ShipViaCombobox", attr: "shipVia"},
              {kind: "XV.DateWidget", attr: "shipDate"},
              {kind: "XV.CustomerProspectWidget", attr: "order.customer.number",
                showAddress: true, label: "_customer".loc(),
                nameAttribute: ""},
              {kind: "XV.MoneyWidget",
                attr: {localValue: "freight", currency: "currency"},
                label: "_freight".loc()},
              {kind: "onyx.GroupboxHeader", content: "_notes".loc()},
              {kind: "XV.TextArea", attr: "notes", fit: true}
            ]}
          ]},
          {kind: "XV.ShipmentLineRelationsBox", attr: "lineItems", fit: true}
        ]}
      ]
    });

    XV.registerModelWorkspace("XM.ShipmentLine", "XV.ShipmentWorkspace");
    XV.registerModelWorkspace("XM.Shipment", "XV.ShipmentWorkspace");

  };
}());
