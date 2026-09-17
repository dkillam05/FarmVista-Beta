/* FarmVista — Scoular Waverly grain-ticket template
   Elevator-specific interpretation belongs here, not in Cloud OCR. */
(function () {
  'use strict';
  window.FVGrainTicketTemplates = window.FVGrainTicketTemplates || {};

  const clean = v => String(v == null ? '' : v).trim();
  const compact = v => clean(v).toLowerCase().replace(/[^a-z0-9]/g, '');
  const num = v => {
    const n = Number(String(v == null ? '' : v).replace(/[,\s]/g, ''));
    return Number.isFinite(n) ? n : null;
  };
  const round2 = n => Number(Number(n).toFixed(2));

  function matches(ticket, text) {
    const hay = compact([
      ticket?.elevatorName,
      ticket?.deliveryStreet,
      ticket?.deliveryCity,
      ticket?.deliveryState,
      ticket?.deliveryZip,
      text
    ].filter(Boolean).join(' '));
    const scoular = hay.includes('scoular');
    const wave = hay.includes('elevatoridwave') || hay.includes('waverly') || hay.includes('wave');
    const address = hay.includes('15379jasmineroad') || hay.includes('jasmineroad');
    return (scoular && (wave || address)) || (wave && address);
  }

  function crop(text, ticket) {
    const s = String(text || '');
    if (/Yellow\s+Corn|\bCorn\s*\(YC\)/i.test(s)) return 'Corn';
    if (/Soybeans?|\bSoy\b/i.test(s)) return 'Soybeans';
    return ticket?.crop || null;
  }

  function gradeBlock(text) {
    const s = String(text || '').replace(/\r/g, '\n');
    let start = s.search(/Grade\s*:?\s*U\.?S\.?/i);
    if (start < 0) start = s.search(/Calibration\s+ID/i);
    if (start < 0) start = s.search(/Test\s*Weight|Testyveight|Moisture|Damaged\s+Kernels|Broken\s+Corn|Foreign\s+Mat/i);
    if (start < 0) return '';
    let block = s.slice(start, start + 1800);
    const stop = block.search(/\bGROSS\s+(?:L\.?BS|LBS|WEIGHT)\b|\bGross\s+Bushels\b/i);
    if (stop > 0) block = block.slice(0, stop);
    return block;
  }

  function plausibleGradeSet(values) {
    if (!values || values.length !== 4) return null;
    const [tw, mo, dm, fm] = values;
    if (!(tw >= 45 && tw <= 70)) return null;
    if (!(mo >= 7 && mo <= 35)) return null;
    if (!(dm >= 0 && dm <= 20)) return null;
    if (!(fm >= 0 && fm <= 20)) return null;
    return { testWeight: tw, moisture: mo, damage: dm, foreignMaterial: fm };
  }

  function normalizeGradeToken(raw, slot) {
    let t = String(raw || '').trim().replace(',', '.').replace(':', '.');
    if (!t) return null;
    let n = Number(t);
    if (!Number.isFinite(n)) return null;

    if (slot === 0) {
      if (n >= 45 && n <= 70) return n;
      if (!t.includes('.') && n >= 450 && n <= 700) return n / 10;
      return null;
    }

    if (slot === 1) {
      if (n >= 7 && n <= 35 && t.includes('.')) return n;
      if (!t.includes('.') && n >= 70 && n <= 350) return n / 10;
      if (n >= 7 && n <= 35) return n;
      return null;
    }

    /* On this Scoular layout DM/FM are printed with one decimal. OCR commonly
       drops that decimal: 20 => 2.0 and 11 => 1.1. Preserve explicit decimals. */
    if (t.includes('.') && n >= 0 && n <= 20) return n;
    if (!t.includes('.') && t.length === 2 && n >= 0 && n <= 99) return n / 10;
    if (!t.includes('.') && t.length === 3 && n >= 0 && n <= 200) return n / 10;
    if (n >= 0 && n <= 9) return n;
    return null;
  }

  function grades(text) {
    let block = gradeBlock(text);
    if (!block) return null;

    /* Repair the punctuation error seen repeatedly on Waverly tickets: 59:5. */
    block = block.replace(/(\d{1,2})\s*[:;]\s*(\d)(?!\d)/g, '$1.$2');

    const tokens = [...block.matchAll(/(?<!\d)(\d{1,3}(?:[.,]\d{1,2})?)(?!\d)/g)]
      .map(m => m[1]);

    /* Find four consecutive values that satisfy the known printed order
       TW -> MO -> DM -> FM. This deliberately ignores unrelated labels/text. */
    for (let i = 0; i <= tokens.length - 4; i++) {
      const vals = tokens.slice(i, i + 4).map((v, slot) => normalizeGradeToken(v, slot));
      if (vals.every(v => v != null)) {
        const set = plausibleGradeSet(vals);
        if (set) return { ...set, confidence: 'scoular_waverly_fixed_grade_order_recovered' };
      }
    }

    return null;
  }

  function allWeightCandidates(text, ticket) {
    const s = String(text || '');
    const values = [...s.matchAll(/(?<![\d.])(\d{2,3}[, ]\d{3}|\d{5,6})(?:\s*LBS?)?(?![\d.])/gi)]
      .map(m => num(m[1]))
      .filter(n => Number.isFinite(n) && n >= 15000 && n <= 100000);

    [ticket?.grossWeight, ticket?.tareWeight, ticket?.netWeight]
      .map(Number)
      .filter(n => Number.isFinite(n) && n >= 15000 && n <= 100000)
      .forEach(n => values.push(n));

    return [...new Set(values)];
  }

  function weights(text, ticket) {
    const vals = allWeightCandidates(text, ticket);
    let best = null;

    /* Do not trust Cloud's field labels here. Search the raw recognized numbers
       for a physically valid Scoular weight equation: gross - tare = net. */
    for (const gross of vals) {
      for (const tare of vals) {
        for (const net of vals) {
          if (gross === tare || gross === net || tare === net) continue;
          if (gross < 40000 || gross > 95000) continue;
          if (tare < 20000 || tare > 35000) continue;
          if (net < 15000 || net > 75000) continue;
          const error = Math.abs((gross - tare) - net);
          if (error > 20) continue;
          if (!best || error < best.error) best = { grossWeight: gross, tareWeight: tare, netWeight: net, error };
        }
      }
    }

    if (best) return { ...best, confidence: 'raw_weight_math_verified' };
    return null;
  }

  function printedBushels(text) {
    const s = String(text || '');
    const values = [...s.matchAll(/(?<!\d)(\d{3,4}[.,]\d{1,2})\s*(?:BU|Bushels?)\b/gi)]
      .map(m => num(String(m[1]).replace(',', '.')))
      .filter(v => Number.isFinite(v) && v > 100 && v < 1200);
    return values;
  }

  function bushels(text, ticket, w) {
    const vals = printedBushels(text);
    const divisor = ticket?.crop === 'Soybeans' ? 60 : ticket?.crop === 'Corn' ? 56 : null;
    const derived = w?.netWeight && divisor ? round2(w.netWeight / divisor) : null;

    if (vals.length && derived != null) {
      const close = vals.filter(v => Math.abs(v - derived) <= Math.max(1, derived * 0.02));
      if (close.length) {
        const net = close[close.length - 1];
        const gross = close.length > 1 ? close[0] : net;
        return { grossBushels: gross, netBushels: net, confidence: 'printed_weight_crosscheck' };
      }
    }

    if (derived != null) {
      return { grossBushels: derived, netBushels: derived, confidence: 'verified_weight_derived' };
    }

    return null;
  }

  function ticketNumber(text, current) {
    const s = String(text || '');
    const patterns = [
      /Inbound\s+Ticket\s*(?:No\.?|#|Number)?\s*[:#-]?\s*(\d{5,8})/i,
      /Ticket\s*(?:No\.?|#|Number)\s*[:#-]?\s*(\d{5,8})/i
    ];
    for (const pattern of patterns) {
      const m = s.match(pattern);
      if (m) return m[1];
    }
    return current || null;
  }

  function ticketDate(text, current) {
    const s = String(text || '');
    const m = s.match(/\b(0?[1-9]|1[0-2])[\/-](0?[1-9]|[12]\d|3[01])[\/-](20\d{2})\b/);
    if (m) return `${m[3]}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
    return current || null;
  }

  function apply(ticket, text) {
    if (!matches(ticket, text)) return { matched: false, changed: false, complete: false };

    ticket.crop = crop(text, ticket);
    ticket.ticketNumber = ticketNumber(text, ticket.ticketNumber);
    ticket.ticketDate = ticketDate(text, ticket.ticketDate);

    const g = grades(text);
    const w = weights(text, ticket);
    const b = bushels(text, ticket, w);
    let changed = false;

    if (g) {
      Object.assign(ticket, { testWeight: g.testWeight, moisture: g.moisture, damage: g.damage, foreignMaterial: g.foreignMaterial });
      changed = true;
    }
    if (w) {
      Object.assign(ticket, { grossWeight: w.grossWeight, tareWeight: w.tareWeight, netWeight: w.netWeight });
      changed = true;
    }
    if (b) {
      ticket.grossBushels = b.grossBushels;
      ticket.netBushels = b.netBushels;
      ticket.calculatedGrossBushels = b.grossBushels;
      ticket.calculatedNetBushels = b.netBushels;
      ticket.printedGrossBushels = b.confidence.startsWith('printed') ? b.grossBushels : null;
      ticket.printedNetBushels = b.confidence.startsWith('printed') ? b.netBushels : null;
      ticket.shrinkBushels = round2(Math.max(0, b.grossBushels - b.netBushels));
      changed = true;
    }

    const customer = String(text || '').match(/Customer\s+ID\s*:\s*([A-Z0-9-]+)/i);
    if (customer) {
      ticket.customerText = clean(customer[1]);
      ticket.customerAccountText = clean(customer[1]);
      changed = true;
    }

    ticket.elevatorName = 'Scoular - Waverly';
    ticket.deliveryStreet = '15379 Jasmine Road';
    ticket.deliveryCity = 'Waverly';
    ticket.deliveryState = 'IL';
    ticket.deliveryZip = '62692';
    ticket.parserProfile = 'scoular_waverly_github';

    const complete = !!(g && w && b && ticket.ticketNumber && ticket.ticketDate && ticket.crop);

    console.log('[Grain Ticket] Scoular Waverly template result:', {
      complete,
      ticketNumber: ticket.ticketNumber,
      ticketDate: ticket.ticketDate,
      crop: ticket.crop,
      grades: g,
      weights: w,
      bushels: b
    });

    return { matched: true, changed, complete, grades: g, weights: w, bushels: b };
  }

  window.FVGrainTicketTemplates.scoularWaverly = { matches, apply };
})();
