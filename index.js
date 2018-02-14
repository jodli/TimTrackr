var inquirer = require('inquirer');
const log = require('loglevel');
const fs = require('fs');

function readBookingPositions(inFile) {
    return new Promise(function (resolve, reject) {
        const csvReader = require('fast-csv');

        let bookingPositions = [];
        log.info('Setting up csv reader.');
        const csvStream = csvReader.fromStream(fs.createReadStream(inFile), {
            delimiter: ';',
            headers: true,
            comment: '#',
            ignoreEmpty: true
        }).transform(function (data) {
            return {
                "Project": data.Project,
                "Registrations": data.Registrations.split(",")
            }
        }).on('data', async (data) => {
            log.info(data);
            bookingPositions.push(data);
            log.info("Booking position list now contains: " + bookingPositions.length);
        }).on('end', async (data) => {
            log.info('No more rows.');
            resolve(bookingPositions);
        });
    });
}

function createBookings(bookingPositions, bookings) {
    return createMoreBookings(bookingPositions, bookings).then(moreBookings => {
        if (moreBookings) {
            return createBookings(bookingPositions, bookings);
        } else {
            return bookings;
        }
    });
}

function createMoreBookings(bookingPositions, bookings) {
    return new Promise(function (resolve, reject) {
        createNewBooking(bookingPositions).then(booking => {
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

function createNewBooking(bookingPositions) {
    return new Promise(function (resolve, reject) {
        let booking = {};
        log.info(bookingPositions);
        var selectProject = inquirer.createPromptModule();
        selectProject([{
            type: "list",
            name: "project",
            message: "Which project?",
            choices: bookingPositions.map(x => x.Project)
        }]).then(answers => {
            booking.project = answers.project;
            //log.info(booking);
            var selectRegistration = inquirer.createPromptModule();
            selectRegistration([{
                type: "list",
                name: "registration",
                message: "Which registration?",
                choices: bookingPositions.filter(x => x.Project == answers.project)[0].Registrations
            }]).then(answers => {
                booking.registration = answers.registration;
                //log.info(booking);
                var selectDate = inquirer.createPromptModule();
                selectDate.registerPrompt('datetime', require('inquirer-datepicker-prompt'));
                selectDate([{
                    type: "datetime",
                    name: "date",
                    message: "On what date?",
                    format: ['dd', '.', 'mm', '.', 'yyyy']
                }]).then(answers => {
                    booking.date = answers.date;
                    //log.info(booking);
                    var selectDuration = inquirer.createPromptModule();
                    selectDuration([{
                        type: "input",
                        name: "duration",
                        message: "For how long?",
                    }]).then(answers => {
                        booking.duration = answers.duration;
                        //log.info(booking);
                        var enterComment = inquirer.createPromptModule();
                        enterComment([{
                            type: "input",
                            name: "comment",
                            message: "What did you do?"
                        }]).then(answers => {
                            booking.comment = answers.comment;
                            //log.info(booking);
                            var confirm = inquirer.createPromptModule();
                            confirm([{
                                type: "confirm",
                                name: "confirm",
                                message: "Is this correct?"
                            }]).then(answers => {
                                //log.info(booking);
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

function bookBookings(bookings) {
    log.info("Booking your booking now.");
    log.info(bookings);
}

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

log.setLevel('info');
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
    log.info(answers);
    if (answers.getOrBook == "get") {
    }
    else if (answers.getOrBook == "book") {
        readBookingPositions("20180213JBc(Project+Registrations).csv").then(
            (bookingPositions) => {
                const bookingList = [];
                createBookings(bookingPositions, bookingList).then(bookings => {
                    bookBookings(bookings);
                });
            });
    }
});