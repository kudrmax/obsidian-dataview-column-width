import type { ColumnWidths } from "./ColumnWidthStore";

export class ColumnLayout {
	static readonly MIN_WIDTH_PX = 16;
	static readonly FULL = 100;

	static moveBorder(
		widths: number[],
		border: number,
		delta: number,
		maxTotal: number,
		min = ColumnLayout.MIN_WIDTH_PX,
	): number[] {
		const left = widths[border];
		if (left === undefined) return [...widths];
		const result = [...widths];
		const right = widths[border + 1];
		if (right === undefined) {
			const others = ColumnLayout.sum(widths) - left;
			result[border] = Math.min(Math.max(left + delta, min), Math.max(maxTotal - others, min));
			return result;
		}
		const shift = Math.min(Math.max(delta, min - left), right - min);
		result[border] = left + shift;
		result[border + 1] = right - shift;
		return result;
	}

	static shares(widths: number[]): number[] {
		return ColumnLayout.percentsOf(widths, ColumnLayout.sum(widths));
	}

	static percentsOf(widths: number[], containerWidth: number): number[] {
		if (containerWidth <= 0) return widths.map(() => 0);
		return widths.map((width) => ColumnLayout.round((width / containerWidth) * ColumnLayout.FULL));
	}

	static toPercents(headers: string[], widths: number[], containerWidth: number): ColumnWidths {
		const percents = ColumnLayout.percentsOf(widths, containerWidth);
		const result: ColumnWidths = {};
		headers.forEach((header, index) => {
			result[header] = percents[index]!;
		});
		return result;
	}

	static percentsFor(headers: string[], stored: ColumnWidths): number[] | null {
		const known = headers.filter((header) => stored[header] !== undefined);
		if (known.length === 0) return null;
		const unknownCount = headers.length - known.length;
		const knownTotal = ColumnLayout.sum(known.map((header) => stored[header]!));
		const remainder = Math.max(ColumnLayout.FULL - knownTotal, 0);
		const fallback = unknownCount === 0 ? 0 : Math.max(remainder / unknownCount, ColumnLayout.FULL / headers.length / 2);
		const raw = headers.map((header) => stored[header] ?? fallback);
		const total = ColumnLayout.sum(raw);
		const scale = total > ColumnLayout.FULL ? ColumnLayout.FULL / total : 1;
		return raw.map((value) => ColumnLayout.round(value * scale));
	}

	static sum(values: number[]): number {
		return values.reduce((total, value) => total + value, 0);
	}

	private static round(value: number): number {
		return Math.round(value * 1000) / 1000;
	}
}
