import datetime
#Initialize a list of roommates and duties
roommates = ['Lucas', 'Marco', 'Diego'  ]

duties = ['Stove, Fridge', 'Trash, Recycle', 'Bathroom, Sink, Sweeping']

#Set the start date
date = datetime.date(2015,6,17)
#Define a time delta of one week
week = datetime.timedelta(weeks=1)
#Define number of weeks to do
number_of_weeks = 12

#Get a file pointer for writing an html
#(creates file in place)
f = open('duties.html', 'w+')

#HTML helper function for adding to an html table
def add_to_row(row, string, checkbox = False):
    #Append string to an html table row called row
    #If checkbox is true, put a checkbox in front of the string
    #Useful for duties
    if checkbox:
        string = '<input type="checkbox">'+string
    return row+'<td>'+string+'</td>'

#Set the style of the overall document using CSS
f.write("""<style>
    table, td {
        border: 1px solid black;
        font-family: 'Helvetica Neue';
        font-weight: light;
        font-size: 14px;
        }
        </style>""")

#Start the table!
f.write("<table>")
#Write the first cell: a bold 'Deadline'
first_row = add_to_row('', '<b>Deadline:</b>')
#Add each of the roommates (also bold)
for roommate in roommates:
    first_row = add_to_row(first_row, '<b>%s</b>'%roommate)
#Now that the row is complete, add it to the table as a row
f.write('<tr>'+first_row+'</tr>')


#Now I iterate for the number of weeks specifies
for weekind in range(number_of_weeks):
    row = ''
    #This specifies how to print out a datetime object:
    #I want the month in letters (%B) and the day in numbers (%d) 
    date_format = '%B %d'
    #Use aforementioned formatting
    date_string = date.strftime(date_format)
    #Add that date to the row
    row = add_to_row(row, date_string)
    #for each roommate
    for r_ind, roommate in enumerate(roommates):
        #Duties are assigned in a cycle of 4 (r_ind%4) 
        #which is shifted by 1 each week (weekind)
        #Get the duty from the list of duties
        duty = duties[(weekind+r_ind)%len(roommates)]
        #Add it to the row with a checkbox
    	row = add_to_row(row, duty, checkbox=True)
    #Now that the row is done, add it to the table
    f.write('<tr>'+row+'</tr>')
    #Go forward in time one week
    date += week
f.write("</table>")
f.close()



