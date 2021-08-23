// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// EH: very messy, for demo only
var pbie_report = null;
var is_report_rendered = null;
var embedData = null;
// EH: very messy, for demo only

$(function () {

    // page setup date time filters
    var calendar_date_config = {
        dateFormat: 'yy-mm-dd',
   
        onClose: function(dateText, inst) {
            // console.log("in onClose");
            // console.log(dateText);
            // console.log(inst);
        },

        onSelect: async function(dateText, inst) {
            console.log("in onSelect");
            // console.log(dateText);
            // console.log(inst);
            await update_report_filters_slicers();
        }
    };

    let start_calendar_date_config = calendar_date_config;
        start_calendar_date_config['defaultDate'] = new Date(2019, 00, 01);
    $( "#start_date" ).datepicker(start_calendar_date_config);

    let end_calendar_date_config = calendar_date_config;
        end_calendar_date_config['defaultDate'] = new Date(2019, 07, 30);
    $( "#end_date" ).datepicker(end_calendar_date_config);

    var datetime_day_ids = {"Monday": "MON", "Tuesday": "TUE", "Wednesday": "WED", 
                            "Thursday": "THU", "Friday": "FRI", "Saturday": "SAT", 
                            "Sunday": "SUN"};
    var datetime_15min_ids = (()=> {
        // just a list of 15min hhmm with thier bucket ids
        // hours = 00 ~ 23, minutes = 00, 15, 30, 45
        let hhmm_id = 1; // powerbi side started from 0
        let rows = {};
        for(a=0;a<24;a++) {
            for(b=0;b<60;b+=15){
                let hh = a.toString().padStart(2, "0");
                let mm = b.toString().padStart(2, "0");
                let hhmm = hh + ":" + mm;
                //console.log(hhmm + " => " + hhmm_id);
                rows[hhmm] = hhmm_id++;
            }
        }
        return rows;
    })();

    // populate start end time 
    $.each(datetime_15min_ids, function(key, value) {
        $('#start_time').append(`<option value="${value}">${key}</option>`);
        $('#end_time').append(`<option value="${value}">${key}</option>`);
    });
    $('#start_time').val(1);
    $('#end_time').val(96);

    // POWERBI embed codes
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
        type: "POST",
        url: "/fetch_token_ethan", // http://0.0.0.0:5001/fetch_token, /fetch_token_ethan
        data: JSON.stringify({
            'workspace_id' : 'a65d61bc-12db-4bc0-95a1-ed88e9fe42b0',
            'username' : 'ethanhobl',
            // EH: the following later will be abstracted to `tier` levels
            //     which tier user has access to?
            //     what reports are available on which tier?
            'report_ids' : [
                    '11c08945-f1b0-4013-8fb8-daf93a8b4102', // expanded_volume_nsw_daily_lga_1.4.2
                    //'4196546b-3e5c-4124-ad6c-b5a94636507b'  // expanded_volume_nsw_hourly_lga_1.4.0
                ]
        }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (data) {
            console.log(data);
            embedData = $.parseJSON(JSON.stringify(data));

            console.log("Response...");
            console.log(embedData);

            // EH: try add report that's not part of token request
            //     WIP: malformed report entry actually
            // badId = '0238d9f5-cbeb-409f-a6b4-9ce993b665f4';
            // badReport = {
            //     datasetId: "bc8ed430-0f8c-4e76-9327-23e7e3061777",
            //     embedUrl: "https://app.powerbi.com/reportEmbed?reportId=0238d9f5-cbeb-409f-a6b4-9ce993b665f4&autoAuth=true&ctid=c2f52191-1cd3-40d7-a02c-b8a024896337",
            //     id: "0238d9f5-cbeb-409f-a6b4-9ce993b665f4",
            //     name: "BAD - INSIGHT_FREE_1.9.12",
            //     reportType: "PowerBIReport"
            // }
            // embedData.reportConfig[badId] = badReport;
            // console.log("Adjusted report with bad data");
            // console.log(embedData);

            init_report_options();

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

    var init_report_options = function() {
        reports = embedData.reportConfig;
        
        select = $("<select>").attr("id", "ddlReports");
        for (const [key, report] of Object.entries(reports)) {
            option = $("<option>").val(report['id']).text(report['name']);
            select.append(option);
        }

        // bind event
        select.on("change", function(e){
            console.log(e);
            console.log(this);
            load_selected_report($(this).val());
        });

        $("div#reports").text("").append(select);

        // let's load the first report by default
        // set the selected option and trigger the change event
        select.prop("selectedIndex", 0).change();

        // bind events for date time elements
        // $('#start_date').on('change', function(){
        //     console.log("start_date change");
        //     update_report_filters_slicers();
        // });
        // $('#end_date').on('change', function(){
        //     console.log("start_date change");
        //     update_report_filters_slicers();
        // });
        $('#start_time').on('change', function(){
            console.log("start_date change");
            update_report_filters_slicers();
        });
        $('#end_time').on('change', function(){
            console.log("start_date change");
            update_report_filters_slicers();
        });
        $("input[name='day_of_week[]']").on('change', function(){
            console.log("start_date change");
            update_report_filters_slicers();
        });
    }

    var load_selected_report = function(report_id) {
        console.log("load_selected_report");
        console.log(report_id);

        reports = embedData.reportConfig;
        cReport = reports[report_id];

        reportLoadConfig.accessToken = embedData.accessToken;
        // You can embed different reports as per your need
        reportLoadConfig.embedUrl = cReport.embedUrl;

        console.log("Embedding report : " + cReport['name']);

        // Use the token expiry to regenerate Embed token for seamless end user experience
        // Refer https://aka.ms/RefreshEmbedToken
        // EH: need to further study this, what happens when user's token expire, how do we make it seamless?
        tokenExpiry = embedData.tokenExpiry;

        // Embed Power BI report when Access token and Embed URL are available
        var report = powerbi.embed(reportContainer, reportLoadConfig);
        pbie_report = report;

        // Triggers when a report schema is successfully loaded
        report.on("loaded", function () {
            console.log("Report load successful");
        });

        // Triggers when a report is successfully embedded in UI
        report.on("rendered", function () {
            console.log("Report render successful");
        });
    }

    /***
     * Pseudo:
     * - get form values
     * - update respective slicers with filters
     *   - get active page slicers
     *   - loop through each and apply filter
     * - update geo filters if needed
     */
    var update_report_filters_slicers = async function() {

        // geo dimension = filter
        // let geo_filters = get_geo_filter();
        // pbie_report.removeFilters();
        // pbie_report.setFilters(geo_filters)
        // .catch(errors => {
        //     console.log("Err");
        //     console.log(errors)
        // });

        // datetime dimension = slicers
        await update_datetime_slicers();
        // pbie_report.setSlicerState(datetime_slicers)
        // .catch(errors => {
        //     console.log("Err");
        //     console.log(errors)
        // });
    }

    var get_geo_filter = function() {

    }

    var update_datetime_slicers = async function() {
        console.log("update_datetime_slicers");
        /**
         * get date, 15min buckets, day types
         * TODO: please replace with typescript or react equavalent
         */
        let startDate = $('#start_date').val().toString();
        let endDate = $('#end_date').val().toString();
        let startTime = $('#start_time').val().toString();
        let endTime = $('#end_time').val().toString();
        let activeDays = [];
        $("input[name='day_of_week[]']:checked").each(function(){activeDays.push($(this).val().toString());});

        console.log(startDate);
        console.log(endDate);
        console.log(startTime);
        console.log(endTime);
        console.log(activeDays);

        slicers = await get_page_slicers();
        console.log("get_page_slicers");
        console.log(slicers);

        // date
        // Caveat: 
        // we need to hard code the `T00:00:00.000Z` time portion into the dates
        // somehow powerbi doesnt respect the date format we have in powerbi report
        // we need to pass full date and time in ISO 8601 (UTC) datetime format
        // https://en.wikipedia.org/wiki/ISO_8601
        // e.g - 2021-08-23T03:39:39Z
        timeFormat = "T00:00:00.000Z";
        dateFilter = getAdvancedAndFilter("Date Range 1", "Date", 
                                              startDate+timeFormat, 
                                              endDate+timeFormat
                                            );
        // should get the condition for reseting filter for date also
        // basically minDate and maxDate condition
        //console.log(dateFilter);
        slicers['slicer1_date'].setSlicerState( {
            filters: [dateFilter]
        }).catch(errors => {
            console.log("slicer1_date Error");
            console.log(errors)
        });

        // hhmm
        // we have 96 X 15mins in 24 hours (24*4)
        // if startTime = 1 and endTime = 96, we should just clear the filter
        if(startTime == 1 && endTime== 96 ) {
            // set slicer filter to empty array to remove filters
            await slicers['slicer1_hhmm'].setSlicerState({
                filters: []
            });
        } else { // we add filter
            hhmmFilter = getAdvancedAndFilter("Time Range 1", "dim_time_id", startTime, endTime);
            //console.log(hhmmFilter);
            await slicers['slicer1_hhmm'].setSlicerState( {
                filters: [hhmmFilter]
            }).catch(errors => {
                console.log("slicer1_hhmm Error");
                console.log(errors)
            });
        }

        // days
        // if activeDays are all selected, we should not filter the day slicer
        if( activeDays.length == 8 ) {
            // set slicer filter to empty array to remove filters
            await slicers['slicer1_days'].setSlicerState({
                filters: []
            });
        } else {
            daysFilter = getBasicInFilter("Days Range 1", "Day_type", activeDays);
            console.log(daysFilter);
            await slicers['slicer1_days'].setSlicerState( {
                filters: [daysFilter]
            }).catch(errors => {
                console.log("slicer1_days Error");
                console.log(errors)
            });
        }
    }

    var get_active_page = async function() {
        pages = await pbie_report.getPages();
        console.log("get_active_page");
        console.log(pages);
        activePage = {};
        pages.forEach(elem => {
            if(elem['isActive']) {
                activePage = elem;
            }
        });

        return activePage;
    };

    var get_page_slicers = async function() {
        activePage = await get_active_page();
        visuals = await activePage.getVisuals();
        console.log("get_page_slicers");
        console.log(visuals);
        slicers = {};
        visuals.forEach(elem => {
            if(elem['type']=='slicer') {
                key = elem['title'];
                slicers[key] = elem;
            }
        });

        return slicers;
    };

    // real bad, ms schema is not very consistent
    // ref: https://docs.microsoft.com/en-us/javascript/api/overview/powerbi/control-report-filters#advanced-filter
    var getAdvancedAndFilter = function(table, column, val1, val2) {
        return {
            $schema: "http://powerbi.com/product/schema#advanced",
            target: {
                table: table,
                column: column
            },
            logicalOperator: "And",
            conditions: [
                {
                    operator: "GreaterThanOrEqual",
                    value: val1
                },
                {
                    operator: "LessThanOrEqual",
                    value: val2
                }
            ],
            filterType: window['powerbi-client'].models.FilterType.Advanced
        };
    }

    // real bad, ms schema is not very consistent
    // ref: https://docs.microsoft.com/en-us/javascript/api/overview/powerbi/control-report-filters#basic-filter
    var getBasicInFilter = function(table, column, vals) {
        return {
            $schema: "http://powerbi.com/product/schema#basic",
            target: {
                table: table,
                column: column
            },
            operator: "In",
            values: vals,
            filterType: window['powerbi-client'].models.FilterType.Basic,
            requireSingleSelection: false
        };
    };
});