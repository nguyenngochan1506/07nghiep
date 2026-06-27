const VND_NUMBER_FORMATTER = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 1,
});

function toAmount(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;

  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function formatVndAmountPart(value: number | string) {
  const amount = Number(value);

  if (amount >= 1_000_000) {
    return {
      value: VND_NUMBER_FORMATTER.format(amount / 1_000_000),
      unit: "triệu",
    };
  }

  return {
    value: VND_NUMBER_FORMATTER.format(amount),
    unit: "",
  };
}

function formatAmountWithUnit(value: number | string) {
  const amount = formatVndAmountPart(value);
  return amount.unit ? `${amount.value} ${amount.unit}` : amount.value;
}

export function formatSalaryRangeVnd(
  salaryMin?: number | string | null,
  salaryMax?: number | string | null,
  salaryNegotiable?: boolean | null,
) {
  if (salaryNegotiable) return "Thỏa thuận";

  const min = toAmount(salaryMin);
  const max = toAmount(salaryMax);

  if (min && max) {
    const minPart = formatVndAmountPart(min);
    const maxPart = formatVndAmountPart(max);

    if (minPart.unit && minPart.unit === maxPart.unit) {
      return `${minPart.value} - ${maxPart.value} ${minPart.unit} VND`;
    }

    return `${formatAmountWithUnit(min)} - ${formatAmountWithUnit(max)} VND`;
  }

  if (min) return `Từ ${formatAmountWithUnit(min)} VND`;
  if (max) return `Đến ${formatAmountWithUnit(max)} VND`;

  return "Thỏa thuận";
}
