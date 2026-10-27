const { eachDayOfInterval, format, parse, isValid } = require('date-fns');

const allDaysBetweenIntervals = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return [];
    try {
        let startDate = parse(checkIn.toString(), 'dd/MM/yyyy', new Date());
        let endDate = parse(checkOut.toString(), 'dd/MM/yyyy', new Date());

        if (!isValid(startDate) || !isValid(endDate)) {
            // Fallback for standard date string parsing
            startDate = new Date(checkIn);
            endDate = new Date(checkOut);
        }

        if (!isValid(startDate) || !isValid(endDate)) {
            return [];
        }

        // Ensure start is before or equal to end
        if (startDate > endDate) {
            const temp = startDate;
            startDate = endDate;
            endDate = temp;
        }

        const allDates = eachDayOfInterval({ start: startDate, end: endDate });
        return allDates.map(date => format(date, 'dd/MM/yyyy'));
    } catch (err) {
        console.error('Error generating date interval:', err.message);
        return [];
    }
};

module.exports = allDaysBetweenIntervals;
