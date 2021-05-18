// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// EH: very messy, for demo only
var pbie_report = null;
var is_report_rendered = null;
// EH: very messy, for demo only

$(function () {
    var reportContainer = $("#report-container").get(0);

    // Initialize iframe for embedding report
    powerbi.bootstrap(reportContainer, { type: "report" });

    var models = window["powerbi-client"].models;
    var reportLoadConfig = {
        type: "report",
        tokenType: models.TokenType.Embed,

        // Enable this setting to remove gray shoulders from embedded report

        // EH: hiding report footer page tabs/navigation
        // ref: https://community.powerbi.com/t5/Developer/How-to-Hide-Power-BI-iFrame-Embedded-Report-Tabs/m-p/121541
        settings: {
            //background: models.BackgroundType.Transparent
            filterPaneEnabled: false,
            navContentPaneEnabled: false,
            visualRenderedEvents: true
        }
        // EH: hiding report footer page tabs/navigation
    };

    $.ajax({
        type: "GET",
        url: "/getembedinfo",
        dataType: "json",
        success: function (data) {
            embedData = $.parseJSON(JSON.stringify(data));
            reportLoadConfig.accessToken = embedData.accessToken;

            // You can embed different reports as per your need
            reportLoadConfig.embedUrl = embedData.reportConfig[0].embedUrl;

            // Use the token expiry to regenerate Embed token for seamless end user experience
            // Refer https://aka.ms/RefreshEmbedToken
            tokenExpiry = embedData.tokenExpiry;

            // Embed Power BI report when Access token and Embed URL are available
            var report = powerbi.embed(reportContainer, reportLoadConfig);
            pbie_report = report;

            // Triggers when a report schema is successfully loaded
            report.on("loaded", function () {
                console.log("Report load successful");

                // EH: set page to 2nd page (LGA)
                report.getPages()
                .then(pages => {
                    console.log("Listing all page objects");
                    //console.log(pages); // <--- should contain ALL pages
                    /**
                     * Page object, key properties:
                     * - displayName : the name we gave the page in powerbi
                     * - name        : the page ID, e.g. ReportSection!@$%#$^
                     * - visibility  : is this visible to end users probably
                     */
                    var cpage = pages[1];
                    cpage.setActive();
                });
                // EH: set page to 2nd page (LGA)
            });

            // EH: report page change event
            report.on('pageChanged', event => {
                const page = event.detail.newPage;
                report.selectedPage = page;

                console.log("Page changed event");
            });
            // EH: report page change event

            // Triggers when a report is successfully embedded in UI
            report.on("rendered", function () {
                console.log("Report render successful");
                is_report_rendered = true;

                report.getFilters().then(filters => {
                    console.log("Current report filters : ");
                    console.log(filters);
                });      
            });

            // EH: Testing other events
            // ref: - https://github.com/Microsoft/PowerBI-JavaScript/wiki/Handling-Events
            //      - https://docs.microsoft.com/en-us/javascript/api/overview/powerbi/handle-events
            // EH: Not so sure how this triggered
            report.on("buttonClicked", function (event) {
                console.log("buttonClicked event");
                console.log(event);
            });

            // EH: Not so sure how this triggered
            report.on("commandTriggered", function (event) {
                console.log("commandTriggered event");
                console.log(event);
            });

            // EH: Not so sure how this triggered
            report.on("dataHyperlinkClicked", function (event) {
                console.log("dataHyperlinkClicked event");
                console.log(event);
            });

            // this is the one we are after
            report.on("dataSelected", function (event) {
                console.log("dataSelected event");
                console.log(event);
            });

            // EH: weird, gets triggered even I click on a visual but nothing changed
            // report.on("selectionChanged", function (event) {
            //     console.log("selectionChanged event");
            //     console.log(event);
            // });

            // EH: gets triggered just as we click on the visual
            // report.on("visualClicked", function (event) {
            //     console.log("visualClicked event");
            //     console.log(event);
            // });

            // EH: bit annoying, triggered on EACH visual
            // report.on("visualRendered", function (event) {
            //     // requires setting visualRenderedEvents to true in the settings
            //     console.log("visualRendered event");
            //     console.log(event);
            // });

            // EH: Testing other events

            // Clear any other error handler event
            report.off("error");

            // Below patch of code is for handling errors that occur during embedding
            report.on("error", function (event) {
                var errorMsg = event.detail;

                // Use errorMsg variable to log error in any destination of choice
                console.error(errorMsg);
                return;
            });
        },
        error: function (err) {

            // Show error container
            var errorContainer = $(".error-container");
            $(".embed-container").hide();
            errorContainer.show();

            // Format error message
            var errMessageHtml = "<strong> Error Details: </strong> <br/>" + $.parseJSON(err.responseText)["errorMsg"];
            errMessageHtml = errMessageHtml.split("\n").join("<br/>")

            // Show error message on UI
            errorContainer.html(errMessageHtml);
        }
    });


    // EH : extra code for demo
    // ughh need to translate the year month to YYYYMM_id zzz
    // please ignore this, just some powerbi hack for the date ids because of our monthly report
    var generate_YYYYMM_id = function() {
        var ids = {};
        var index = 1;
        for(a = 2019; a<2022; a++) {
            for(b = 1; b<13; b++) {
                if( a == 2021 && b == 4) {
                    break;
                }

                let key = a + '-' + b.toString().padStart(2, '0');
                //console.log(key);
                ids [key] = index++;
            }
        }

        return ids;
    }
    // just YYYYMM_id againts sequencial ID
    var YYYYMM_id = generate_YYYYMM_id();
    //console.log(YYYYMM_id);

    // EH: prototyping powerbi embed js interaction, calendar plugin via jqueryui
    var calendar_yearmonth_config = {
        changeMonth: true,
        changeYear: true,
        showButtonPanel: true,
        yearRange: "2019:2021",
        dateFormat: 'yy-mm',
   
        onClose: function() {
           var iMonth = $("#ui-datepicker-div .ui-datepicker-month :selected").val();
           var iYear = $("#ui-datepicker-div .ui-datepicker-year :selected").val();

           if (iYear > 2021 || iYear < 2019 || 
                (iYear == 2021 && iMonth > 2)) {
                alert("Only 2019-01 to 2021-03 available");
                return false;
           } else {
                $(this).datepicker('setDate', new Date(iYear, iMonth, 1));
                update_report_filters();
           }
        }
    };

    let start_calendar_yearmonth_config = calendar_yearmonth_config;
        start_calendar_yearmonth_config['defaultDate'] = new Date(2019, 00, 01);
    $( "#start_yearmonth" ).datepicker(start_calendar_yearmonth_config);

    let end_calendar_yearmonth_config = calendar_yearmonth_config;
        end_calendar_yearmonth_config['defaultDate'] = new Date(2021, 02, 01);
    $( "#end_yearmonth" ).datepicker(end_calendar_yearmonth_config);

    $( "input[name='lga']").on("change", function(){
        update_report_filters();
    });

    // just serializing the checkbox to arrays
    var get_lgas = function() {
        return $( "input[name='lga']:checked").map(function(){return $(this).val()}).get();
    }

    // ref: 
    // - https://github.com/microsoft/PowerBI-JavaScript/wiki/Embed-Configuration-Details - report config
    // slicer
    // - https://docs.microsoft.com/en-us/javascript/api/overview/powerbi/control-report-slicers#range-slicer
    // filters
    // - https://github.com/Microsoft/PowerBI-JavaScript/wiki/Filters
    // - https://github.com/Microsoft/PowerBI-JavaScript/wiki/Filters#page-level-and-visual-level-filters
    // we create the slicer config object and update the report
    var update_report_filters = function() {
        // EH: GIST 
        // - compile list of filters we want to apply, 
        // - remove all filters on page or report, 
        // - reapply new filter
        // ^ from my understanding, the remove filter should be a seperate ajax, but it is VERY responsive
        //   if that's the case it should be OK to do remove all and readd filters

        console.log( "selected dates : " + $( "#start_yearmonth" ).val() + " ~ " + $( "#end_yearmonth" ).val() );
        console.log( "selected lga : " );
        console.log(get_lgas());

        // EH: ***propose to keep a state of filters that we apply to the report on front end
        let pbie_filters = [];

        // only do this if report is rendered
        if(is_report_rendered) {
            // diff with slicer is that, its not in an object of array, see test2
            const dateFilter = {
                $schema: "http://powerbi.com/product/schema#advanced",
                target: {
                    table: "dates_months",
                    column: "YYYYMM_id"
                },
                logicalOperator: "Between",
                conditions: [
                    {
                        operator: "GreaterThanOrEqual",
                        value: YYYYMM_id[ $( "#start_yearmonth" ).val() ]
                    },
                    {
                        operator: "LessThanOrEqual",
                        value: YYYYMM_id[ $( "#end_yearmonth" ).val() ]
                    }
                ],
                filterType: 0// models.FilterType.AdvancedFilter
            };
            pbie_filters.push(dateFilter);

            console.log("Date Filter");
            console.log(dateFilter);
        }

        if (is_report_rendered && get_lgas().length>0) {
            geoFilter = {
                $schema: "http://powerbi.com/product/schema#basic",
                target: {
                    table: "intelemap",
                    column: "entity_intelemap_link_lga_name"
                },
                operator: "In",
                values: get_lgas(),
                filterType: 1 // pbi.models.FilterType.BasicFilter,
            }
            pbie_filters.push(geoFilter);

            console.log("Geo Filter");
            console.log(geoFilter);
        }


        // apply slicer?
        // ref: https://github.com/Microsoft/PowerBI-JavaScript/wiki/Filters
        //      we can do report, page, visual level filters, have a read ^
        //      but the gist is, we can do report/page level filters, without slicers
        if (pbie_filters.length > 0) {
            // EH: removes all filter, suprisingly this does not lag??? :D
            pbie_report.removeFilters(); 

            pbie_report.setFilters(pbie_filters)
            .catch(errors => {
                console.log("Err");
                console.log(errors)
            });
        }
    };

});