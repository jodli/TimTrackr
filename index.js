var inquirer = require('inquirer');

var bookingPositions = [{
    project: "P00001 Project 1",
    registrations: ["1-1234-P00001 Reg A", "1-1235-P00001 Reg B"]
}, {
    project: "P00002 Project 2",
    registrations: ["1-1234-P00001 Reg C", "1-1235-P00001 Reg D"]
}];

function createBookings(bookings) {
    return createMoreBookings(bookings).then(moreBookings => {
        if (moreBookings) {
            return createBookings(bookings);
        } else {
            return bookings;
        }
    });
}

function createMoreBookings(bookings) {
    return new Promise(function (resolve, reject) {
        createNewBooking().then(booking => {
            if (booking) {
                bookings.push(booking);
            }

            var moreBookingsFunction = inquirer.createPromptModule();
            moreBookingsFunction([{
                type: "confirm",
                name: "moreBookings",
                message: "More bookings?"
            }]).then(answers => {
                resolve(answers.moreBookings);
            });
        });
    });
}

function createNewBooking() {
    return new Promise(function (resolve, reject) {
        let booking = {};

        var selectProject = inquirer.createPromptModule();
        selectProject([{
            type: "list",
            name: "project",
            message: "Which project?",
            choices: bookingPositions.map(x => x.project)
        }]).then(answers => {
            booking.project = answers.project;
            //console.info(booking);
            var selectRegistration = inquirer.createPromptModule();
            selectRegistration([{
                type: "list",
                name: "registration",
                message: "Which registration?",
                choices: bookingPositions.filter(x => x.project == answers.project)[0].registrations
            }]).then(answers => {
                booking.registration = answers.registration;
                //console.info(booking);
                var selectDate = inquirer.createPromptModule();
                selectDate.registerPrompt('datetime', require('inquirer-datepicker-prompt'));
                selectDate([{
                    type: "datetime",
                    name: "date",
                    message: "On what date?",
                    format: ['dd', '.', 'mm', '.', 'yyyy']
                }]).then(answers => {
                    booking.date = answers.date;
                    //console.info(booking);
                    var selectDuration = inquirer.createPromptModule();
                    selectDuration([{
                        type: "input",
                        name: "duration",
                        message: "For how long?",
                    }]).then(answers => {
                        booking.duration = answers.duration;
                        //console.info(booking);
                        var enterComment = inquirer.createPromptModule();
                        enterComment([{
                            type: "input",
                            name: "comment",
                            message: "What did you do?"
                        }]).then(answers => {
                            booking.comment = answers.comment;
                            //console.info(booking);
                            var confirm = inquirer.createPromptModule();
                            confirm([{
                                type: "confirm",
                                name: "confirm",
                                message: "Is this correct?"
                            }]).then(answers => {
                                //console.info(booking);
                                if (answers.confirm) {
                                    resolve(booking);
                                } else {
                                    resolve(null);
                                }
                            });
                        });
                    });
                });
            });
        });
    });
}

async function bookBookings(bookings) {
    console.info("Booking your booking now.");
    console.info(bookings);
}

var selectFunction = inquirer.createPromptModule();
selectFunction([{
    type: "list",
    name: "getOrBook",
    message: "What do you want, bro?",
    choices: [{
        name: "Get projects and booking positions",
        value: "get"
    },
    {
        name: "Define and book project times",
        value: "book"
    }]
}]).then(answers => {
    console.info(answers);
    if (answers.getOrBook == "get") {
    }
    else if (answers.getOrBook == "book") {
        const bookingList = [];
        createBookings(bookingList).then(bookings => {
            bookBookings(bookings);
        });
    }
});