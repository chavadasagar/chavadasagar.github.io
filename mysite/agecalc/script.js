$(document).ready(function () {
  const $dobInput = $('#datepicker');
  const $targetDateInput = $('#targetDatepicker');
  const $calcBtn = $('#calcBtn');
  const $resetBtn = $('#resetBtn');
  const $themeToggleBtn = $('#themeToggle');
  const $resultsContainer = $('#resultsContainer');
  const $errorMsg = $('#errorMsg');
  const $presetChips = $('.preset-chip');

  // Outputs
  const $yearsOut = $('#yearsVal');
  const $monthsOut = $('#monthsVal');
  const $daysOut = $('#daysVal');
  
  const $nextBdayText = $('#nextBdayText');
  const $nextBdaySub = $('#nextBdaySub');
  
  const $bornDayVal = $('#bornDayVal');
  const $zodiacVal = $('#zodiacVal');
  const $totalMonthsVal = $('#totalMonthsVal');
  const $totalWeeksVal = $('#totalWeeksVal');
  const $totalDaysVal = $('#totalDaysVal');
  const $totalHoursVal = $('#totalHoursVal');

  const today = new Date();
  const currentYear = today.getFullYear();
  const todayStr = $.datepicker.formatDate('yy-mm-dd', today);
  $targetDateInput.val(todayStr);

  // Initialize jQuery UI Datepicker for Date of Birth
  $dobInput.datepicker({
    changeMonth: true,
    changeYear: true,
    yearRange: "1900:" + currentYear,
    maxDate: 0,
    dateFormat: "yy-mm-dd",
    showAnim: "fadeIn",
    onSelect: function () {
      calculateAge();
    }
  });

  // Initialize jQuery UI Datepicker for Target Date
  $targetDateInput.datepicker({
    changeMonth: true,
    changeYear: true,
    yearRange: "1900:2050",
    dateFormat: "yy-mm-dd",
    showAnim: "fadeIn",
    onSelect: function () {
      calculateAge();
    }
  });

  // Quick Preset Chips Click Handler
  $presetChips.on('click', function () {
    $presetChips.removeClass('active');
    $(this).addClass('active');
    
    const year = $(this).data('year');
    const defaultDate = `${year}-01-01`;
    $dobInput.datepicker('setDate', defaultDate);
    calculateAge();
  });

  // Dark / Light Theme Switching
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    $('html').attr('data-theme', 'light');
    $themeToggleBtn.html('<i class="fa-solid fa-moon"></i>');
  } else {
    $('html').removeAttr('data-theme');
    $themeToggleBtn.html('<i class="fa-solid fa-sun"></i>');
  }

  $themeToggleBtn.on('click', function () {
    const isLight = $('html').attr('data-theme') === 'light';
    if (isLight) {
      $('html').removeAttr('data-theme');
      localStorage.setItem('theme', 'dark');
      $(this).html('<i class="fa-solid fa-sun"></i>');
    } else {
      $('html').attr('data-theme', 'light');
      localStorage.setItem('theme', 'light');
      $(this).html('<i class="fa-solid fa-moon"></i>');
    }
  });

  // Age Calculation Function
  function calculateAge() {
    $errorMsg.removeClass('visible');

    const dobVal = $dobInput.val();
    if (!dobVal) {
      showError('Please select your date of birth.');
      return;
    }

    const birthDate = $.datepicker.parseDate('yy-mm-dd', dobVal);
    const targetVal = $targetDateInput.val();
    const targetDate = targetVal 
      ? $.datepicker.parseDate('yy-mm-dd', targetVal) 
      : new Date();

    if (!birthDate) {
      showError('Invalid birth date.');
      return;
    }

    if (birthDate > targetDate) {
      showError('Date of birth cannot be in the future.');
      return;
    }

    // Precise calculations
    let years = targetDate.getFullYear() - birthDate.getFullYear();
    let months = targetDate.getMonth() - birthDate.getMonth();
    let days = targetDate.getDate() - birthDate.getDate();

    if (days < 0) {
      months--;
      const prevMonthLastDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0).getDate();
      days += prevMonthLastDay;
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    // Totals
    const diffTime = Math.abs(targetDate - birthDate);
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.floor(totalDays / 7);
    const totalMonths = years * 12 + months;
    const totalHours = Math.floor(diffTime / (1000 * 60 * 60));

    // Next Birthday calculation
    const currentY = targetDate.getFullYear();
    let nextBday = new Date(currentY, birthDate.getMonth(), birthDate.getDate());
    
    const checkTarget = new Date(targetDate);
    checkTarget.setHours(0,0,0,0);

    if (checkTarget > nextBday) {
      nextBday.setFullYear(currentY + 1);
    }

    const diffNextBday = nextBday - checkTarget;
    const nextBdayDaysTotal = Math.ceil(diffNextBday / (1000 * 60 * 60 * 24));

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bornDay = daysOfWeek[birthDate.getDay()];
    const nextBdayDayOfWeek = daysOfWeek[nextBday.getDay()];

    const zodiacSign = getZodiacSign(birthDate.getMonth() + 1, birthDate.getDate());

    // Update UI with jQuery animations
    $resultsContainer.addClass('active');
    
    animateValue($yearsOut, 0, years, 700);
    animateValue($monthsOut, 0, months, 700);
    animateValue($daysOut, 0, days, 700);

    // Banner Text
    if (nextBdayDaysTotal === 0 || (birthDate.getMonth() === targetDate.getMonth() && birthDate.getDate() === targetDate.getDate())) {
      $nextBdayText.text("🎉 Happy Birthday Today! 🎂");
      $nextBdaySub.text("Hope you have an amazing day!");
    } else {
      $nextBdayText.text(`${nextBdayDaysTotal} Day${nextBdayDaysTotal > 1 ? 's' : ''} Remaining`);
      $nextBdaySub.text(`Falls on a ${nextBdayDayOfWeek}`);
    }

    // Stats Grid
    $bornDayVal.text(bornDay);
    $zodiacVal.text(zodiacSign);
    $totalMonthsVal.text(totalMonths.toLocaleString());
    $totalWeeksVal.text(totalWeeks.toLocaleString());
    $totalDaysVal.text(totalDays.toLocaleString());
    $totalHoursVal.text(totalHours.toLocaleString());

    // Smooth scroll to results
    $('html, body').animate({
      scrollTop: $resultsContainer.offset().top - 20
    }, 500);
  }

  function showError(msg) {
    $errorMsg.text(msg).addClass('visible');
    $resultsContainer.removeClass('active');
  }

  // jQuery Number Count Animation
  function animateValue($el, start, end, duration) {
    if (start === end) {
      $el.text(end);
      return;
    }
    $({ countNum: start }).animate({ countNum: end }, {
      duration: duration,
      easing: 'swing',
      step: function () {
        $el.text(Math.floor(this.countNum));
      },
      complete: function () {
        $el.text(this.countNum);
      }
    });
  }

  function getZodiacSign(m, d) {
    if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return "Capricorn ♑";
    if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return "Aquarius ♒";
    if ((m === 2 && d >= 19) || (m === 3 && d <= 20)) return "Pisces ♓";
    if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return "Aries ♈";
    if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return "Taurus ♉";
    if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return "Gemini ♊";
    if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return "Cancer ♋";
    if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return "Leo ♌";
    if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return "Virgo ♍";
    if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return "Libra ♎";
    if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return "Scorpio ♏";
    if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return "Sagittarius ♐";
    return "Unknown";
  }

  // Calculate Button Click
  $calcBtn.on('click', calculateAge);

  // Reset Button Click
  $resetBtn.on('click', function () {
    $dobInput.val('');
    $targetDateInput.val(todayStr);
    $presetChips.removeClass('active');
    $errorMsg.removeClass('visible');
    $resultsContainer.removeClass('active');
  });
});