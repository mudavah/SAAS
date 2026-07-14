/**
 * KaziFlow — Payroll Tax Computation (Kenya)
 * ------------------------------------------------------------------
 * Pure functions for statutory payroll deductions: PAYE, NSSF, NHIF,
 * Housing Levy, and Pension. All rates are current as of 2024/2025.
 */

export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
}

export interface DeductionResult {
  name: string;
  amount: number;
  baseAmount?: number;
  rate?: number;
}

const PAYE_BRACKETS: TaxBracket[] = [
  { min: 0, max: 24000, rate: 0.10 },
  { min: 24001, max: 32333, rate: 0.25 },
  { min: 32334, max: null, rate: 0.30 },
];

const PERSONAL_RELIEF = 2400;
const INSURANCE_RELIEF_RATE = 0.15;
const INSURANCE_RELIEF_MAX = 5000;

export function computePAYE(grossSalary: number, nssfDeduction: number = 0, insurancePremium: number = 0): DeductionResult {
  let tax = 0;
  for (const bracket of PAYE_BRACKETS) {
    if (grossSalary > bracket.min) {
      const taxableInBracket = bracket.max
        ? Math.min(grossSalary, bracket.max) - bracket.min
        : grossSalary - bracket.min;
      tax += Math.max(0, taxableInBracket) * bracket.rate;
    }
  }

  let relief = PERSONAL_RELIEF;
  if (insurancePremium > 0) {
    const insuranceRelief = Math.min(insurancePremium * INSURANCE_RELIEF_RATE, INSURANCE_RELIEF_MAX);
    relief += insuranceRelief;
  }

  const paye = Math.max(0, tax - relief);
  return {
    name: "PAYE",
    amount: Math.round(paye),
    baseAmount: Math.round(grossSalary),
    rate: 0,
  };
}

export function computeNSSF(grossSalary: number): DeductionResult {
  const tier1Limit = 8000;
  const tier2Limit = 72000;
  const rate = 0.06;

  const tier1 = Math.min(grossSalary, tier1Limit) * rate;
  const tier2 = grossSalary > tier1Limit ? Math.min(grossSalary - tier1Limit, tier2Limit - tier1Limit) * rate : 0;

  return {
    name: "NSSF",
    amount: Math.round(tier1 + tier2),
    baseAmount: Math.round(grossSalary),
    rate,
  };
}

export function computeNHIF(grossSalary: number): DeductionResult {
  const brackets: [number, number][] = [
    [0, 5999],
    [6000, 7999],
    [8000, 11999],
    [12000, 14999],
    [15000, 19999],
    [20000, 24999],
    [25000, 29999],
    [30000, 34999],
    [35000, 39999],
    [40000, 44999],
    [45000, 49999],
    [50000, 59999],
    [60000, 69999],
    [70000, 79999],
    [80000, 89999],
    [90000, 99999],
    [100000, 99999999],
  ];

  const flatAmounts = [150, 300, 400, 500, 600, 750, 850, 900, 950, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700];

  let nhif = 1700;
  for (let i = brackets.length - 1; i >= 0; i--) {
    const [min, max] = brackets[i];
    if (grossSalary >= min) {
      nhif = flatAmounts[i];
      break;
    }
  }

  return {
    name: "NHIF",
    amount: nhif,
    baseAmount: Math.round(grossSalary),
    rate: 0,
  };
}

export function computeHousingLevy(grossSalary: number): DeductionResult {
  const maxPensionable = 72000;
  const rate = 0.015;
  const taxable = Math.min(grossSalary, maxPensionable);
  const amount = taxable * rate;

  return {
    name: "Housing Levy",
    amount: Math.round(amount),
    baseAmount: Math.round(grossSalary),
    rate,
  };
}

export function computePension(grossSalary: number, employeeRate: number = 0.05, maxPensionable: number = 72000): DeductionResult {
  const taxable = Math.min(grossSalary, maxPensionable);
  const amount = taxable * employeeRate;

  return {
    name: "Pension",
    amount: Math.round(amount),
    baseAmount: Math.round(grossSalary),
    rate: employeeRate,
  };
}

export interface PayrollBreakdown {
  grossSalary: number;
  basicSalary: number;
  allowances: { name: string; amount: number }[];
  overtime: number;
  bonus: number;
  totalEarnings: number;
  nssf: number;
  nhif: number;
  paye: number;
  housingLevy: number;
  pension: number;
  otherDeductions: { name: string; amount: number }[];
  totalDeductions: number;
  totalTax: number;
  netPay: number;
}

export function computePayrollBreakdown(params: {
  basicSalary: number;
  allowances?: { name: string; amount: number }[];
  overtime?: number;
  bonus?: number;
  otherDeductions?: { name: string; amount: number }[];
  insurancePremium?: number;
  employeePensionRate?: number;
}): PayrollBreakdown {
  const basicSalary = Math.round(params.basicSalary);
  const allowances = params.allowances ?? [];
  const overtime = Math.round(params.overtime ?? 0);
  const bonus = Math.round(params.bonus ?? 0);
  const otherDeductions = params.otherDeductions ?? [];
  const insurancePremium = Math.round(params.insurancePremium ?? 0);
  const employeePensionRate = params.employeePensionRate ?? 0.05;

  const totalAllowances = allowances.reduce((sum, a) => sum + a.amount, 0);
  const totalEarnings = basicSalary + totalAllowances + overtime + bonus;

  const nssfResult = computeNSSF(totalEarnings);
  const nhifResult = computeNHIF(totalEarnings);
  const payeResult = computePAYE(totalEarnings, nssfResult.amount, insurancePremium);
  const housingLevyResult = computeHousingLevy(totalEarnings);
  const pensionResult = computePension(totalEarnings, employeePensionRate);

  const statutoryDeductions = nssfResult.amount + nhifResult.amount + payeResult.amount + housingLevyResult.amount + pensionResult.amount;
  const otherDeductionsTotal = otherDeductions.reduce((sum, d) => sum + d.amount, 0);
  const totalDeductions = statutoryDeductions + otherDeductionsTotal;
  const totalTax = payeResult.amount;
  const netPay = Math.max(0, totalEarnings - totalDeductions);

  return {
    grossSalary: totalEarnings,
    basicSalary,
    allowances,
    overtime,
    bonus,
    totalEarnings,
    nssf: nssfResult.amount,
    nhif: nhifResult.amount,
    paye: payeResult.amount,
    housingLevy: housingLevyResult.amount,
    pension: pensionResult.amount,
    otherDeductions,
    totalDeductions,
    totalTax,
    netPay,
  };
}

export const PAYE_BRACKETS_INFO = [
  { min: 0, max: 24000, rate: "10%" },
  { min: 24001, max: 32333, rate: "25%" },
  { min: 32334, max: "Above", rate: "30%" },
];

export const NSSF_TIERS = [
  { tier: "I", min: 0, max: 8000, rate: "6%" },
  { tier: "II", min: 8001, max: 72000, rate: "6%" },
];

export const NHIF_BRACKETS = [
  { min: 0, max: 5999, amount: 150 },
  { min: 6000, max: 7999, amount: 300 },
  { min: 8000, max: 11999, amount: 400 },
  { min: 12000, max: 14999, amount: 500 },
  { min: 15000, max: 19999, amount: 600 },
  { min: 20000, max: 24999, amount: 750 },
  { min: 25000, max: 29999, amount: 850 },
  { min: 30000, max: 34999, amount: 900 },
  { min: 35000, max: 39999, amount: 950 },
  { min: 40000, max: 44999, amount: 1000 },
  { min: 45000, max: 49999, amount: 1100 },
  { min: 50000, max: 59999, amount: 1200 },
  { min: 60000, max: 69999, amount: 1300 },
  { min: 70000, max: 79999, amount: 1400 },
  { min: 80000, max: 89999, amount: 1500 },
  { min: 90000, max: 99999, amount: 1600 },
  { min: 100000, max: null, amount: 1700 },
];
