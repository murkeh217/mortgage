/* My Local Mortgage Advisor — Dynamic Landing Page JS */

document.addEventListener('DOMContentLoaded', () => {

  /* ============================================================
     STICKY HEADER
  ============================================================ */
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });

  /* ============================================================
     MOBILE MENU
  ============================================================ */
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');

  hamburger.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('open');
    hamburger.classList.toggle('active', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  mobileNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      hamburger.classList.remove('active');
      document.body.style.overflow = '';
    });
  });

  /* ============================================================
     HERO SLIDESHOW
  ============================================================ */
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');
  let currentSlide = 0;
  let autoTimer;

  function goToSlide(index) {
    slides[currentSlide].classList.remove('active');
    slides[currentSlide].classList.add('prev');
    dots[currentSlide].classList.remove('active');

    setTimeout(() => slides[index].classList.remove('prev'), 900);

    currentSlide = index;
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
  }

  function nextSlide() { goToSlide((currentSlide + 1) % slides.length); }
  function prevSlide() { goToSlide((currentSlide - 1 + slides.length) % slides.length); }

  function startAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(nextSlide, 5500);
  }

  document.getElementById('next-arrow').addEventListener('click', () => { nextSlide(); startAuto(); });
  document.getElementById('prev-arrow').addEventListener('click', () => { prevSlide(); startAuto(); });

  dots.forEach((dot, i) => dot.addEventListener('click', () => { goToSlide(i); startAuto(); }));

  slides[0].classList.add('active');
  dots[0].classList.add('active');
  startAuto();

  /* ============================================================
     SMOOTH SCROLL
  ============================================================ */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const trustBar = document.querySelector('.trust-bar');
        const offset = header.offsetHeight + (trustBar ? trustBar.offsetHeight : 0) + 12;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* ============================================================
     SCROLL REVEAL
  ============================================================ */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  /* ============================================================
     MORTGAGE CALCULATOR
  ============================================================ */
  let liveRate = 4.5; // fallback until BoE fetch resolves

  const calcFields = {
    price: document.getElementById('calc-price'),
    priceVal: document.getElementById('calc-price-val'),
    deposit: document.getElementById('calc-deposit'),
    depositVal: document.getElementById('calc-deposit-val'),
    rateVal: document.getElementById('calc-rate-val'),
    term: document.getElementById('calc-term'),
  };

  const resultMonthly = document.getElementById('result-monthly');
  const resultTotal = document.getElementById('result-total');
  const resultInterest = document.getElementById('result-interest');
  const resultLtv = document.getElementById('result-ltv');
  const ltvFill = document.getElementById('ltv-fill');

  function formatGBP(n) {
    if (n >= 1000000) return '£' + (n / 1000000).toFixed(2) + 'm';
    if (n >= 1000) return '£' + Math.round(n).toLocaleString('en-GB');
    return '£' + Math.round(n);
  }

  function updateRangeStyle(input) {
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    const val = parseFloat(input.value);
    const pct = ((val - min) / (max - min)) * 100;
    input.style.setProperty('--pct', pct + '%');
  }

  function calculateMortgage() {
    const P = parseFloat(calcFields.price.value) || 400000;
    const D = parseFloat(calcFields.deposit.value) || 80000;
    const annualRate = liveRate / 100;
    const years = parseInt(calcFields.term.value) || 25;

    const loan = Math.max(P - D, 0);
    const n = years * 12;
    const r = annualRate / 12;

    let monthly;
    if (r === 0) {
      monthly = loan / n;
    } else {
      monthly = (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }

    const total = monthly * n;
    const interest = total - loan;
    const ltv = P > 0 ? (loan / P) * 100 : 0;

    calcFields.priceVal.textContent = formatGBP(P);
    calcFields.depositVal.textContent = formatGBP(D);
    calcFields.rateVal.textContent = liveRate.toFixed(2) + '%';

    resultMonthly.textContent = formatGBP(monthly) + '/mo';
    resultTotal.textContent = formatGBP(total);
    resultInterest.textContent = formatGBP(interest);
    resultLtv.textContent = ltv.toFixed(1) + '%';
    ltvFill.style.width = Math.min(ltv, 100) + '%';
    ltvFill.style.background = ltv > 90 ? '#ef4444' : ltv > 75 ? '#f59e0b' : 'linear-gradient(to right, #b86f69, #e06a64)';

    updateRangeStyle(calcFields.price);
    updateRangeStyle(calcFields.deposit);
  }

  [calcFields.price, calcFields.deposit].forEach(input => {
    input.addEventListener('input', calculateMortgage);
  });
  calcFields.term.addEventListener('change', calculateMortgage);

  calculateMortgage();

  /* ---- Live Bank of England Base Rate ---- */
  (async function loadBoeRate() {
    try {
      const res = await fetch('/api/boe-rate');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (typeof data.rate === 'number') {
        liveRate = data.rate;
        calculateMortgage();
      }
    } catch (e) {
      console.warn('Could not load BoE rate:', e.message);
    }
  })();

  /* Deposit max follows price */
  calcFields.price.addEventListener('input', () => {
    const p = parseFloat(calcFields.price.value);
    calcFields.deposit.max = p * 0.95;
    if (parseFloat(calcFields.deposit.value) > calcFields.deposit.max) {
      calcFields.deposit.value = calcFields.deposit.max;
    }
  });

  /* ============================================================
     FAQ ACCORDION
  ============================================================ */
  document.querySelectorAll('.faq-item').forEach(item => {
    item.querySelector('.faq-question').addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(openItem => openItem.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  /* ============================================================
     CONTACT FORM
  ============================================================ */
  const form = document.getElementById('contact-form');
  const toast = document.getElementById('toast');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = form.querySelector('#f-name').value.trim();
      const email = form.querySelector('#f-email').value.trim();
      const phone = form.querySelector('#f-phone').value.trim();

      let valid = true;
      if (!name) { showFieldError('f-name', 'Name is required'); valid = false; }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFieldError('f-email', 'Valid email required'); valid = false; }
      if (!phone) { showFieldError('f-phone', 'Phone number is required'); valid = false; }

      if (!valid) return;

      const btn = form.querySelector('.form-submit');
      btn.disabled = true;
      btn.textContent = 'Sending…';

      setTimeout(() => {
        form.reset();
        btn.disabled = false;
        btn.textContent = 'Send Enquiry';
        showToast();
      }, 1200);
    });

    form.querySelectorAll('input, select, textarea').forEach(field => {
      field.addEventListener('input', () => clearFieldError(field.id));
    });
  }

  /* ============================================================
     FLOATING PRIVACY CONSENT
  ============================================================ */
  const floatingPrivacy = document.getElementById('floating-privacy-consent');
  const floatingPrivacyCheck = document.getElementById('floating-privacy-check');

  if (floatingPrivacy && floatingPrivacyCheck) {
    const consentKey = 'privacyPolicyAccepted';

    try {
      if (localStorage.getItem(consentKey) === 'true') {
        floatingPrivacy.classList.add('is-hidden');
      }
    } catch (_) {}

    floatingPrivacyCheck.addEventListener('change', () => {
      if (!floatingPrivacyCheck.checked) return;

      try {
        localStorage.setItem(consentKey, 'true');
      } catch (_) {}

      window.setTimeout(() => {
        floatingPrivacy.classList.add('is-hidden');
      }, 450);
    });
  }

  function showFieldError(id, msg) {
    const field = document.getElementById(id);
    if (!field) return;
    field.style.borderColor = '#ef4444';
    let err = field.parentElement.querySelector('.field-error');
    if (!err) {
      err = document.createElement('span');
      err.className = 'field-error';
      err.style.cssText = 'color:#ef4444;font-size:0.78rem;display:block;margin-top:4px;';
      field.parentElement.appendChild(err);
    }
    err.textContent = msg;
  }

  function clearFieldError(id) {
    const field = document.getElementById(id);
    if (!field) return;
    field.style.borderColor = '';
    const err = field.parentElement.querySelector('.field-error');
    if (err) err.remove();
  }

  function showToast() {
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4500);
  }

  /* ============================================================
     BACK TO TOP
  ============================================================ */
  const backToTop = document.getElementById('back-to-top');
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ============================================================
     STAMP DUTY CALCULATOR
  ============================================================ */
  const sdPrice = document.getElementById('sd-price');
  const sdPriceVal = document.getElementById('sd-price-val');
  const sdBuyer = document.getElementById('sd-buyer');
  const sdUse = document.getElementById('sd-use');

  function calcStampDuty(price, buyerType, useType) {
    let duty = 0;
    const bands = [];

    if (useType === 'commercial') {
      // Non-residential: 0% up to £150k, 2% to £250k, 5% above
      const nonResBands = [[150000, 0], [100000, 0.02], [Infinity, 0.05]];
      let remaining = price;
      for (const [limit, rate] of nonResBands) {
        const taxable = Math.min(remaining, limit);
        const tax = taxable * rate;
        if (taxable > 0) bands.push({ label: rate === 0 ? '0%' : (rate * 100) + '%', taxable, tax });
        duty += tax;
        remaining -= taxable;
        if (remaining <= 0) break;
      }
    } else if (buyerType === 'ftb') {
      // First-time buyer (post April 2025): 0% to £300k, 5% to £500k, standard above
      if (price > 500000) {
        // Standard rates apply (no relief)
        return calcStampDuty(price, 'standard', 'residential');
      }
      const ftbBands = [[300000, 0], [200000, 0.05]];
      let remaining = price;
      for (const [limit, rate] of ftbBands) {
        const taxable = Math.min(remaining, limit);
        const tax = taxable * rate;
        if (taxable > 0) bands.push({ label: rate === 0 ? '0%' : (rate * 100) + '%', taxable, tax });
        duty += tax;
        remaining -= taxable;
        if (remaining <= 0) break;
      }
    } else if (buyerType === 'additional') {
      // Additional property (3% surcharge on all bands)
      const addBands = [[125000, 0.03], [125000, 0.05], [675000, 0.08], [575000, 0.13], [Infinity, 0.15]];
      let remaining = price;
      for (const [limit, rate] of addBands) {
        const taxable = Math.min(remaining, limit);
        const tax = taxable * rate;
        if (taxable > 0) bands.push({ label: (rate * 100) + '%', taxable, tax });
        duty += tax;
        remaining -= taxable;
        if (remaining <= 0) break;
      }
    } else {
      // Standard residential (post April 2025)
      const stdBands = [[125000, 0], [125000, 0.02], [675000, 0.05], [575000, 0.10], [Infinity, 0.12]];
      let remaining = price;
      for (const [limit, rate] of stdBands) {
        const taxable = Math.min(remaining, limit);
        const tax = taxable * rate;
        if (taxable > 0) bands.push({ label: rate === 0 ? '0%' : (rate * 100) + '%', taxable, tax });
        duty += tax;
        remaining -= taxable;
        if (remaining <= 0) break;
      }
    }
    return { duty, bands };
  }

  function updateStampDuty() {
    if (!sdPrice) return;
    const price = parseFloat(sdPrice.value) || 350000;
    const buyerType = sdBuyer ? sdBuyer.value : 'standard';
    const useType = sdUse ? sdUse.value : 'residential';

    sdPriceVal.textContent = formatGBP(price);
    updateRangeStyle(sdPrice);

    const { duty, bands } = calcStampDuty(price, buyerType, useType);
    const effective = price > 0 ? (duty / price) * 100 : 0;

    document.getElementById('sd-result').textContent = formatGBP(duty);
    document.getElementById('sd-effective').textContent = effective.toFixed(2) + '%';
    document.getElementById('sd-price-display').textContent = formatGBP(price);
    document.getElementById('sd-total').textContent = formatGBP(price + duty);

    const breakdown = document.getElementById('sd-breakdown');
    if (breakdown && bands.length) {
      breakdown.innerHTML = '<div class="sd-breakdown-title">Tax Breakdown</div>' +
        bands.filter(b => b.taxable > 0).map(b =>
          `<div class="sd-breakdown-row"><span>${b.label} on ${formatGBP(b.taxable)}</span><span>${formatGBP(b.tax)}</span></div>`
        ).join('');
    }
  }

  if (sdPrice) {
    sdPrice.addEventListener('input', updateStampDuty);
    if (sdBuyer) sdBuyer.addEventListener('change', updateStampDuty);
    if (sdUse) sdUse.addEventListener('change', updateStampDuty);
    updateStampDuty();
  }

  /* ============================================================
     AFFORDABILITY CALCULATOR
  ============================================================ */
  const afIncome1 = document.getElementById('af-income1');
  const afIncome2 = document.getElementById('af-income2');
  const afDebts = document.getElementById('af-debts');
  const afEmployment = document.getElementById('af-employment');

  function updateAffordability() {
    if (!afIncome1) return;
    const inc1 = parseFloat(afIncome1.value) || 0;
    const inc2 = parseFloat(afIncome2.value) || 0;
    const debts = parseFloat(afDebts.value) || 0;
    const employment = afEmployment ? afEmployment.value : 'employed';

    document.getElementById('af-income1-val').textContent = formatGBP(inc1);
    document.getElementById('af-income2-val').textContent = formatGBP(inc2);
    document.getElementById('af-debts-val').textContent = formatGBP(debts) + '/mo';
    updateRangeStyle(afIncome1);
    updateRangeStyle(afIncome2);
    updateRangeStyle(afDebts);

    const combined = inc1 + inc2;
    // Adjust multiplier based on employment type
    let maxMult = employment === 'selfemployed' ? 4.0 : employment === 'contractor' ? 4.75 : 4.5;
    let consMult = employment === 'selfemployed' ? 3.5 : 4.0;

    // Reduce for monthly commitments (annualised x12)
    const annualDebts = debts * 12;
    const effectiveCombined = Math.max(combined - annualDebts * 1.5, 0);

    const maxBorrow = effectiveCombined * maxMult;
    const consBorrow = effectiveCombined * consMult;

    document.getElementById('af-combined').textContent = formatGBP(combined);
    document.getElementById('af-max').textContent = formatGBP(maxBorrow);
    document.getElementById('af-conservative').textContent = formatGBP(consBorrow);
    document.getElementById('af-multiplier').textContent = maxMult + 'x';
  }

  if (afIncome1) {
    [afIncome1, afIncome2, afDebts].forEach(el => el && el.addEventListener('input', updateAffordability));
    if (afEmployment) afEmployment.addEventListener('change', updateAffordability);
    updateAffordability();
  }

  /* ============================================================
     EXIT INTENT POPUP
  ============================================================ */
  const exitPopup = document.getElementById('exit-popup');
  const exitOverlay = document.getElementById('exit-popup-overlay');
  const exitClose = document.getElementById('exit-popup-close');
  const exitDismiss = document.getElementById('exit-popup-dismiss');
  let exitShown = false;

  function showExitPopup() {
    if (exitShown) return;
    exitShown = true;
    exitPopup.classList.add('visible');
    exitOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function hideExitPopup() {
    exitPopup.classList.remove('visible');
    exitOverlay.classList.remove('visible');
    document.body.style.overflow = '';
  }

  // Desktop: mouse leaves viewport from top
  document.addEventListener('mouseleave', (e) => {
    if (e.clientY < 10) showExitPopup();
  });

  // Mobile: show after 45 seconds on page
  setTimeout(() => showExitPopup(), 45000);

  if (exitClose) exitClose.addEventListener('click', hideExitPopup);
  if (exitDismiss) exitDismiss.addEventListener('click', hideExitPopup);
  if (exitOverlay) exitOverlay.addEventListener('click', hideExitPopup);

});
