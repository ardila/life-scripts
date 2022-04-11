import datetime
import random

# Initialize a list of roommates and duties
roommates = ["Bruna", "", "", "Diego", "", ""]


weekly_duties = [
    "Clean dining table",
    "Kitchen surfaces",
    "Trash/recycling/compost",
    "Dust"
]

biweekly_duties = ["Clean Floor"]


def build_2week_duty_cycle():
    week1 = weekly_duties + biweekly_duties + ["You are amazing"]
    week2 = weekly_duties + ["You are loved", "You are amazing"]
    random.shuffle(week1)
    random.shuffle(week2)
    return week1 + week2


# Set the start date
def next_weekday(d, weekday):
    days_ahead = weekday - d.weekday()
    if days_ahead <= 0: # Target day already happened this week
        days_ahead += 7
    return d + datetime.timedelta(days_ahead)

next_monday = next_weekday(datetime.date.today(), 0) # 0 = Monday, 1=Tuesday, 2=Wednesday...
print(next_monday)


#date = datetime.date(2021, 1, 11)
date = next_monday
# Define a time delta of one week
week = datetime.timedelta(weeks=1)
# Define number of weeks to do
number_of_weeks = 12

# Get a file pointer for writing an html
# (creates file in place)
f = open("duties.html", "w+")

# HTML helper function for adding to an html table
def add_to_row(row, string, checkbox=False):
    # Append string to an html table row called row
    # If checkbox is true, put a checkbox in front of the string
    # Useful for duties
    if checkbox:
        string = '<input type="checkbox">' + string
    return row + "<td>" + string + "</td>"


# Set the style of the overall document using CSS
f.write(
    """<style>
    table, td {
        border: 2px solid black;
        font-family: 'Helvetica Neue';
        font-weight: light;
        font-size: 14px;


        }
        tr {
    border-bottom: 1px solid #dddddd;
}

tr:nth-of-type(even) {
    background-color: #f3f3f3;
}

tr:last-of-type {
    border-bottom: 2px solid #009879;
}
        </style>"""
)

# Start the table!
f.write("<table>")
# Write the first cell: a bold 'Deadline'
first_row = add_to_row("", "<b>Deadline:</b>")
# Add each of the roommates (also bold)
for roommate in roommates:
    first_row = add_to_row(first_row, "<b>%s</b>" % roommate)
# Now that the row is complete, add it to the table as a row
f.write("<tr>" + first_row + "</tr>")


# Now I iterate for the number of weeks specifies
duty_ind = 0
for weekind in range(number_of_weeks):
    if weekind % 2 == 0:
        duties = build_2week_duty_cycle()
    row = ""
    # This specifies how to print out a datetime object:
    # I want the month in letters (%B) and the day in numbers (%d)
    date_format = "%B %d"
    # Use aforementioned formatting
    date_string = date.strftime(date_format)
    # Add that date to the row
    row = add_to_row(row, date_string)
    # for each roommate
    for roommate in enumerate(roommates):
        # Duties are assigned in a cycle of 4 (r_ind%4)
        # which is shifted by 1 each week (weekind)
        # Get the duty from the list of duties
        duty = duties[duty_ind % len(duties)]
        duty_ind += 1
        # Add it to the row with a checkbox
        row = add_to_row(row, duty, checkbox=True)
    # Now that the row is done, add it to the table
    f.write("<tr>" + row + "</tr>")
    # Go forward in time one week
    date += week
f.write("</table>")
f.close()
