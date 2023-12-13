export function getPercentageOfYearElapsed() {
  // Get the current date
  const currentDate = new Date();

  // Get the current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Calculate the total number of days in the current year
  let totalDaysInYear = 0;
  if ((currentYear % 4 == 0 && currentYear % 100 != 0) || currentYear % 400 == 0) {
    // Leap year
    totalDaysInYear = 366;
  } else {
    // Not a leap year
    totalDaysInYear = 365;
  }

  // Calculate the number of days that have passed in the current year so far
  let daysElapsed = 0;
  const daysInMonth = [31, totalDaysInYear == 365 ? 28 : 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (let i = 0; i < currentMonth; i++) {
    daysElapsed += daysInMonth[i];
  }
  daysElapsed += currentDate.getDate();
  daysElapsed--;

  console.log("daysElapsed", daysElapsed);

  // Calculate the percentage of the year that has elapsed
  const percentageElapsed = (daysElapsed / totalDaysInYear) * 100;

  return percentageElapsed;
}

export function getPercentageOfMonthDone() {
  // Get the current date
  const currentDate = new Date();

  // Get the current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Calculate the total number of days in the current year
  let isLeapYear = false;
  if ((currentYear % 4 == 0 && currentYear % 100 != 0) || currentYear % 400 == 0) {
    // Leap year
    isLeapYear = true;
  }

  // Calculate the number of days that have passed in the current year so far
  const daysInMonth = [31, isLeapYear == true ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Calculate the percentage of the year that has elapsed
  const percentageElapsed = (currentDate.getDate() / daysInMonth[currentMonth]) * 100;

  return percentageElapsed;
}

export function getThird(percentage: number): 1 | 2 | 3 {
  if (percentage < 33.33) {
    return 1;
  } else if (percentage < 66.67) {
    return 2;
  } else {
    return 3;
  }
}
