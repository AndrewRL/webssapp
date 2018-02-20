// create global variable with value of day passed from rendering of index.html
let initial_day = {{ date_ordinal }};

// refreshes table so additional employees will show up as listed
function refresh_table() {

    // get data from /_get_preferences/<date_ordinal>
    fetch("/_get_preferences/" + initial_day)

        // convert that data to a readable JSON file
        .then(response => response.json())

        // is json_pref_table contained within response?
        // print json_pref_table to console, call set_dates and render_pref_table functions
        .then((json_pref_table) => {
            console.log(json_pref_table);
            set_dates(json_pref_table.dates);
            render_pref_table(json_pref_table.pref_table, json_pref_table.dates, json_pref_table.employees);
    });
}

refresh_table();

// when clicking on an item in the dropdown, create the data pair {"available": true/false} and change
// the label of the dropdown button to read "available" or "unavailable" accordingly
$(".available-dropdown-select").on("click", function () {
    $("#available-dropdown").data("available", $(this).data("val"))
        .text($(this).data("text"));
});

// when "save" is clicked, use ajax to post input employee name to "/_add_employee"
$("#add-employee-submit").on("click", function() {
    console.log("hi");
    $.ajax({
        type: "POST",
        url: "/_add_employee",

        // dict containing "name" key and input value
        data: {name: $("#add-employee-name-input").val()},

        // on successful POST print json_response to console
        // WHAT IS json_response?
        success: function(json_response) {
            console.log(json_response);
        }
    });

    // refresh table to update with new employee
    refresh_table();
});


// adds dates to the header of the table
function set_dates(dates) {
    for (d = 0; d < 7; d++) {
        $("#date-" + d).text(dates[d]);
    }
}


// converts 24-hr time to 12-hr time
function hour_to_12_hour(h) {
    if (h == 0) {
        return {hour: 12, half: "AM"};
    }
    else if (h < 12) {
        return {hour: h, half: "AM"};
    }
    else if (h == 12) {
        return {hour: 12, half: "PM"};
    }
    else {
        return {hour: h - 12, half: "PM"};
    }
}


// converts from X AM/PM to XX
function hour_to_24_hour(h) {

    // if h.half == "AM" return 0, else return 12
    let offset = h.half == "AM" ? 0 : 12;
    if (h.hour == 12 && h.half == "AM") {
        offset = -12;
    }
    else if (h.hour == 12 && h.half == "PM") {
        offset = 0;
    }
    return h.hour + offset;
}


// takes the hour dict from hour_to_12_hour function and returns a string
function hour_to_str(h) {
    let t = hour_to_12_hour(h);
    return t.hour + t.half;
}

/*
        {% for employee in employees %}
            {% set employee_loop = loop %}
        <tr id="employee-row-{{ employee._id }}">
            <th scope="row"><button type="button" class="btn btn-primary"> {{ employee.name }} </th>
            {% for d in range(7) %}
            <td class="employee-pref-box-{{ d }}">
                <button class="btn" data-toggle="modal" data-target="#preference-modal"></button>
            </td>
            {% endfor %}
        </tr>
        {% endfor %}
*/

function render_pref_table(pref_table, dates, employees) {

    // clears text from table
    $("#pref-table-body").empty();

    for (let employee_id in pref_table) {
        console.log(employee_id);

        let emp_row = document.createElement("tr");
        $("#pref-table-body").append(emp_row);
        let emp_name = $("<th/>", { scope: "row" });
        emp_row.append(emp_name[0]);
        emp_name.append($("<button/>", {
            type: "button",
            class: "btn btn-primary",
            text: employees[employee_id].name,
        })[0]);

        for (let [day, shift] of pref_table[employee_id].entries()) {
            let td = $("<td/>");
            emp_row.append(td[0]);

            if (shift.available) {
                var btn_text = hour_to_str(shift.prefs[0][0]) + " - " + hour_to_str(shift.prefs[0][1]);
                if (shift.prefs.length > 1) {
                    btn_text += ", ...";
                }
                var btn_class = "btn-info";
            }
            else {
                var btn_text = "Add availability";
                var btn_class = "btn-light";
            }

            td.append($("<button/>", {
                class: "btn " + btn_class,
                "data-toggle": "modal",
                "data-target": "#preference-modal",
                text: btn_text,
            }).click(function() {
                // note the modal get's opened anyway, just need
                // to modify the info in it
                open_pref_modal(employee_id, day, this);
            }));
        }
    }

    function open_pref_modal(employee_id, day, button_element) {
        let employee_data = pref_table[employee_id][day];
        let available = employee_data.available;

        $("#preference-modal-title").html("<strong>" + employees[employee_id].name + "</strong>: " + dates[day]);

        $("#available-dropdown").text(available ? "Available" : "Unavailable")
            .data("available", available);

        $("#preference-table").empty();
        for (let pref of employee_data.prefs) {
            create_availability_row(pref);
        }

        $("#save-pref-button").off("click").on("click", function() {
            // get the new pref data
            let new_pref = [];
            $("#preference-table").children().each((row_index, row) => {
                let tds = $(row).children();
                let start_time_selects = $(tds[0]).find("select");
                let start_hour = hour_to_24_hour({hour: parseInt($(start_time_selects[0]).val()),
                                                  half: $(start_time_selects[1]).val()});
                let end_time_selects = $(tds[1]).find("select");
                let end_hour = hour_to_24_hour({hour: parseInt($(end_time_selects[0]).val()),
                                                half: $(end_time_selects[1]).val()});

                new_pref.push([start_hour, end_hour]);
            });

            let available = $("#available-dropdown").data("available");

            pref_table[employee_id][day] = {
                prefs: new_pref,
                available: available
            }
            render_pref_table(pref_table, dates, employees);
        });
    }
}

$("#add-availability-button").on("click", function() {
    create_availability_row([0, 1]);
});

function create_availability_row(pref) {
    let pref_row = document.createElement("tr");
    let remove_button = document.createElement("button");
    $(remove_button).addClass("btn btn-danger")
        .text("Remove")
        .on("click", function () {
            pref_row.remove();
        });

    for (let [s, hour_type] of ["start", "end"].entries()) {
        let hour_select = document.createElement("select");
        let t = hour_to_12_hour(pref[s]);
        for (let hour = 1; hour < 13; hour++) {
            $(hour_select).append("<option value="+hour+">"+hour+"</option>");
        }
        $(hour_select).addClass("form-control")
            .val(t.hour);
        let half_select = document.createElement("select");
        $(half_select).addClass("form-control")
            .append('<option value="AM">AM</option>')
            .append('<option value="PM">PM</option>')
            .val(t.half);
        let td = document.createElement("td");
        let div = document.createElement("div");
        $(div).addClass("form-row");
        [hour_select, half_select].forEach(elem => {
            let col = document.createElement("div");
            $(col).addClass("col")
                .append(elem);
            $(div).append(col);
        });
        $(td).append(div);
        $(pref_row).append(td);
    }

    $(pref_row).append(remove_button);

    $("#preference-table").append(pref_row);
}