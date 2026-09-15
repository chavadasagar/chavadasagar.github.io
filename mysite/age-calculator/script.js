$(document).ready(function () {
  // ==========================================
  // 1. TAB NAVIGATION SWITCHER
  // ==========================================
  const $tabBtns = $('.tab-btn');
  const $calcPanels = $('.calc-panel');

  $tabBtns.on('click', function () {
    const targetId = $(this).data('target');
    
    $tabBtns.removeClass('active');
    $(this).addClass('active');

    $calcPanels.removeClass('active');
    $(`#${targetId}`).addClass('active');

    // Trigger initial calculation if switching to EMI or Tax
    if (targetId === 'emi-panel') calculateEMI();
    if (targetId === 'tax-panel') calculateTax();
  });

  // Global Theme Switcher
  const $themeToggleBtn = $('#themeToggle');
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

  // ==========================================
  // 2. AGE CALCULATOR LOGIC
  // ==========================================
  const $dobInput = $('#datepicker');
  const $targetDateInput = $('#targetDatepicker');
  const $calcBtn = $('#calcBtn');
  const $resetBtn = $('#resetBtn');
  const $resultsContainer = $('#resultsContainer');
  const $errorMsg = $('#errorMsg');
  const $presetChips = $('.preset-chip');

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

  // jQuery UI Datepicker initialization
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

  $presetChips.on('click', function () {
    $presetChips.removeClass('active');
    $(this).addClass('active');
    const year = $(this).data('year');
    $dobInput.datepicker('setDate', `${year}-01-01`);
    calculateAge();
  });

  function calculateAge() {
    $errorMsg.removeClass('visible');
    const dobVal = $dobInput.val();
    if (!dobVal) {
      showError('Please select your date of birth.');
      return;
    }

    const birthDate = $.datepicker.parseDate('yy-mm-dd', dobVal);
    const targetVal = $targetDateInput.val();
    const targetDate = targetVal ? $.datepicker.parseDate('yy-mm-dd', targetVal) : new Date();

    if (!birthDate) {
      showError('Invalid birth date.');
      return;
    }

    if (birthDate > targetDate) {
      showError('Date of birth cannot be in the future.');
      return;
    }

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

    const diffTime = Math.abs(targetDate - birthDate);
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.floor(totalDays / 7);
    const totalMonths = years * 12 + months;
    const totalHours = Math.floor(diffTime / (1000 * 60 * 60));

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

    $resultsContainer.addClass('active');
    animateNumber($yearsOut, 0, years, 600);
    animateNumber($monthsOut, 0, months, 600);
    animateNumber($daysOut, 0, days, 600);

    if (nextBdayDaysTotal === 0 || (birthDate.getMonth() === targetDate.getMonth() && birthDate.getDate() === targetDate.getDate())) {
      $nextBdayText.text("🎉 Happy Birthday Today! 🎂");
      $nextBdaySub.text("Hope you have an amazing day!");
    } else {
      $nextBdayText.text(`${nextBdayDaysTotal} Day${nextBdayDaysTotal > 1 ? 's' : ''} Remaining`);
      $nextBdaySub.text(`Falls on a ${nextBdayDayOfWeek}`);
    }

    $bornDayVal.text(bornDay);
    $zodiacVal.text(zodiacSign);
    $totalMonthsVal.text(totalMonths.toLocaleString());
    $totalWeeksVal.text(totalWeeks.toLocaleString());
    $totalDaysVal.text(totalDays.toLocaleString());
    $totalHoursVal.text(totalHours.toLocaleString());
  }

  function showError(msg) {
    $errorMsg.text(msg).addClass('visible');
    $resultsContainer.removeClass('active');
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

  $calcBtn.on('click', calculateAge);
  $resetBtn.on('click', function () {
    $dobInput.val('');
    $targetDateInput.val(todayStr);
    $presetChips.removeClass('active');
    $errorMsg.removeClass('visible');
    $resultsContainer.removeClass('active');
  });

  // ==========================================
  // 3. EMI CALCULATOR LOGIC
  // ==========================================
  const $emiAmount = $('#emiAmount');
  const $emiAmountSlider = $('#emiAmountSlider');
  const $emiAmountDisplay = $('#emiAmountDisplay');

  const $emiRate = $('#emiRate');
  const $emiRateSlider = $('#emiRateSlider');
  const $emiRateDisplay = $('#emiRateDisplay');

  const $emiTenure = $('#emiTenure');
  const $emiTenureSlider = $('#emiTenureSlider');
  const $emiTenureDisplay = $('#emiTenureDisplay');

  const $monthlyEmiVal = $('#monthlyEmiVal');
  const $totalPrincipalVal = $('#totalPrincipalVal');
  const $totalInterestVal = $('#totalInterestVal');
  const $totalPaymentVal = $('#totalPaymentVal');
  const $barPrincipal = $('#barPrincipal');
  const $barInterest = $('#barInterest');
  const $principalPercent = $('#principalPercent');
  const $interestPercent = $('#interestPercent');
  const $emiCalcBtn = $('#emiCalcBtn');
  const $emiResetBtn = $('#emiResetBtn');

  // Sync Input & Sliders
  function syncEmiInputs() {
    $emiAmount.on('input', function () {
      $emiAmountSlider.val($(this).val());
      updateEmiDisplays();
    });
    $emiAmountSlider.on('input', function () {
      $emiAmount.val($(this).val());
      updateEmiDisplays();
    });

    $emiRate.on('input', function () {
      $emiRateSlider.val($(this).val());
      updateEmiDisplays();
    });
    $emiRateSlider.on('input', function () {
      $emiRate.val($(this).val());
      updateEmiDisplays();
    });

    $emiTenure.on('input', function () {
      $emiTenureSlider.val($(this).val());
      updateEmiDisplays();
    });
    $emiTenureSlider.on('input', function () {
      $emiTenure.val($(this).val());
      updateEmiDisplays();
    });
  }

  function updateEmiDisplays() {
    const amt = parseFloat($emiAmount.val()) || 0;
    const rate = parseFloat($emiRate.val()) || 0;
    const tenure = parseFloat($emiTenure.val()) || 0;

    $emiAmountDisplay.text('₹ ' + amt.toLocaleString('en-IN'));
    $emiRateDisplay.text(rate.toFixed(1) + ' %');
    $emiTenureDisplay.text(tenure + ' Years');
    calculateEMI();
  }

  function calculateEMI() {
    const P = parseFloat($emiAmount.val()) || 0;
    const annualRate = parseFloat($emiRate.val()) || 0;
    const years = parseFloat($emiTenure.val()) || 0;

    if (P <= 0 || annualRate <= 0 || years <= 0) return;

    const r = (annualRate / 12) / 100;
    const n = years * 12;

    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayment = emi * n;
    const totalInterest = totalPayment - P;

    const principalRatio = ((P / totalPayment) * 100).toFixed(1);
    const interestRatio = ((totalInterest / totalPayment) * 100).toFixed(1);

    $monthlyEmiVal.text('₹ ' + Math.round(emi).toLocaleString('en-IN'));
    $totalPrincipalVal.text('₹ ' + Math.round(P).toLocaleString('en-IN'));
    $totalInterestVal.text('₹ ' + Math.round(totalInterest).toLocaleString('en-IN'));
    $totalPaymentVal.text('₹ ' + Math.round(totalPayment).toLocaleString('en-IN'));

    $barPrincipal.css('width', principalRatio + '%');
    $barInterest.css('width', interestRatio + '%');
    $principalPercent.text(principalRatio + '%');
    $interestPercent.text(interestRatio + '%');
  }

  syncEmiInputs();
  $emiCalcBtn.on('click', calculateEMI);
  $emiResetBtn.on('click', function () {
    $emiAmount.val(1000000);
    $emiAmountSlider.val(1000000);
    $emiRate.val(8.5);
    $emiRateSlider.val(8.5);
    $emiTenure.val(5);
    $emiTenureSlider.val(5);
    updateEmiDisplays();
  });

  // ==========================================
  // 4. INCOME TAX CALCULATOR LOGIC
  // ==========================================
  const $taxIncome = $('#taxIncome');
  const $taxStdDeduction = $('#taxStdDeduction');
  const $tax80C = $('#tax80C');
  const $tax80D = $('#tax80D');
  const $taxOther = $('#taxOther');

  const $monthlyTakeHomeVal = $('#monthlyTakeHomeVal');
  const $newTaxTotal = $('#newTaxTotal');
  const $newTaxRate = $('#newTaxRate');
  const $oldTaxTotal = $('#oldTaxTotal');
  const $oldTaxRate = $('#oldTaxRate');
  const $newRegimeCard = $('#newRegimeCard');
  const $oldRegimeCard = $('#oldRegimeCard');
  const $newRegimeBadge = $('#newRegimeBadge');
  const $oldRegimeBadge = $('#oldRegimeBadge');
  const $taxSavingAdvice = $('#taxSavingAdvice');
  const $taxCalcBtn = $('#taxCalcBtn');
  const $taxResetBtn = $('#taxResetBtn');

  function calculateTax() {
    const grossIncome = parseFloat($taxIncome.val()) || 0;
    const stdDeduction = parseFloat($taxStdDeduction.val()) || 75000;
    const sec80C = Math.min(parseFloat($tax80C.val()) || 0, 150000);
    const sec80D = parseFloat($tax80D.val()) || 0;
    const otherDeductions = parseFloat($taxOther.val()) || 0;

    // --- NEW TAX REGIME (FY 2024-25 / 2025-26) ---
    // Standard deduction under New Regime is ₹75,000
    const newTaxableIncome = Math.max(0, grossIncome - 75000);
    let newTax = 0;

    if (newTaxableIncome <= 700000) {
      newTax = 0; // Section 87A rebate gives 0 tax up to 7L
    } else {
      if (newTaxableIncome > 1500000) {
        newTax += (newTaxableIncome - 1500000) * 0.30;
        newTax += 300000 * 0.20;
        newTax += 200000 * 0.15;
        newTax += 300000 * 0.10;
        newTax += 400000 * 0.05;
      } else if (newTaxableIncome > 1200000) {
        newTax += (newTaxableIncome - 1200000) * 0.20;
        newTax += 200000 * 0.15;
        newTax += 300000 * 0.10;
        newTax += 400000 * 0.05;
      } else if (newTaxableIncome > 1000000) {
        newTax += (newTaxableIncome - 1000000) * 0.15;
        newTax += 300000 * 0.10;
        newTax += 400000 * 0.05;
      } else if (newTaxableIncome > 700000) {
        newTax += (newTaxableIncome - 700000) * 0.10;
        newTax += 400000 * 0.05;
      } else if (newTaxableIncome > 300000) {
        newTax += (newTaxableIncome - 300000) * 0.05;
      }
    }
    const newTotalTax = Math.round(newTax * 1.04); // 4% Health & Education Cess
    const newEffectiveRate = grossIncome > 0 ? ((newTotalTax / grossIncome) * 100).toFixed(1) : 0;
    const monthlyTakeHome = Math.round((grossIncome - newTotalTax) / 12);

    // --- OLD TAX REGIME ---
    const totalOldDeductions = 50000 + sec80C + sec80D + otherDeductions;
    const oldTaxableIncome = Math.max(0, grossIncome - totalOldDeductions);
    let oldTax = 0;

    if (oldTaxableIncome <= 500000) {
      oldTax = 0; // Section 87A rebate up to 5L
    } else {
      if (oldTaxableIncome > 1000000) {
        oldTax += (oldTaxableIncome - 1000000) * 0.30;
        oldTax += 500000 * 0.20;
        oldTax += 250000 * 0.05;
      } else if (oldTaxableIncome > 500000) {
        oldTax += (oldTaxableIncome - 500000) * 0.20;
        oldTax += 250000 * 0.05;
      } else if (oldTaxableIncome > 250000) {
        oldTax += (oldTaxableIncome - 250000) * 0.05;
      }
    }
    const oldTotalTax = Math.round(oldTax * 1.04);
    const oldEffectiveRate = grossIncome > 0 ? ((oldTotalTax / grossIncome) * 100).toFixed(1) : 0;

    // Update UI
    $monthlyTakeHomeVal.text('₹ ' + monthlyTakeHome.toLocaleString('en-IN'));
    $newTaxTotal.text('₹ ' + newTotalTax.toLocaleString('en-IN'));
    $newTaxRate.text(newEffectiveRate + '%');
    $oldTaxTotal.text('₹ ' + oldTotalTax.toLocaleString('en-IN'));
    $oldTaxRate.text(oldEffectiveRate + '%');

    // Comparison Recommendation
    if (newTotalTax <= oldTotalTax) {
      const diff = oldTotalTax - newTotalTax;
      $newRegimeCard.addClass('recommended');
      $oldRegimeCard.removeClass('recommended');
      $newRegimeBadge.show();
      $oldRegimeBadge.hide();
      $taxSavingAdvice.text(`🎉 You save ₹${diff.toLocaleString('en-IN')} under the New Tax Regime!`);
    } else {
      const diff = newTotalTax - oldTotalTax;
      $oldRegimeCard.addClass('recommended');
      $newRegimeCard.removeClass('recommended');
      $oldRegimeBadge.show();
      $newRegimeBadge.hide();
      $taxSavingAdvice.text(`🎉 You save ₹${diff.toLocaleString('en-IN')} under the Old Tax Regime due to high deductions!`);
    }
  }

  $taxCalcBtn.on('click', calculateTax);
  $taxIncome.on('input', calculateTax);
  $taxStdDeduction.on('input', calculateTax);
  $tax80C.on('input', calculateTax);
  $tax80D.on('input', calculateTax);
  $taxOther.on('input', calculateTax);

  $taxResetBtn.on('click', function () {
    $taxIncome.val(1200000);
    $taxStdDeduction.val(75000);
    $tax80C.val(150000);
    $tax80D.val(25000);
    $taxOther.val(0);
    calculateTax();
  });

  // Helper Number Animation
  function animateNumber($el, start, end, duration) {
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
});