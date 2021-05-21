// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// EH: very messy, for demo only
var pbie_report = null;
var is_report_rendered = null;
var embedData = null;
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
        type: "POST",
        url: "/fetch_token_ethan", // http://0.0.0.0:5001/fetch_token_ethan, /fetch_token_ethan
        data: JSON.stringify({
            'workspace_id' : 'a65d61bc-12db-4bc0-95a1-ed88e9fe42b0',
            'username' : 'ethanhobl',
            // EH: the following later will be abstracted to `tier` levels
            //     which tier user has access to?
            //     what reports are available on which tier?
            'report_ids' : ['5afe6baf-a24e-42e4-897f-baa4be00a1d7', 
                            'e9fde2bc-5005-4b9f-b916-969cf59baf02']
        }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (data) {
            embedData = $.parseJSON(JSON.stringify(data));

            console.log("Response...");
            console.log(embedData);

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
});