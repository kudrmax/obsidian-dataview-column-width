import type { ColumnWidths } from "./ColumnWidthStore";

export class ColumnLayout {
	static readonly MIN_WIDTH_PX = 16;

	static moveBorder(widths: number[], border: number, delta: number, min = ColumnLayout.MIN_WIDTH_PX): number[] {
		const left = widths[border];
		const right = widths[border + 1];
		if (left === undefined || right === undefined) return [...widths];
		const shift = Math.min(Math.max(delta, min - left), right - min);
		const result = [...widths];
		result[border] = left + shift;
		result[border + 1] = right - shift;
		return result;
	}

	static shares(widths: number[]): number[] {
		const total = widths.reduce((sum, width) => sum + width, 0);
		if (total <= 0) return widths.map(() => 0);
		return widths.map((width) => ColumnLayout.round((width / total) * 100));
	}

	static toPercents(headers: string[], widths: number[]): ColumnWidths {
		const shares = ColumnLayout.shares(widths);
		const percents: ColumnWidths = {};
		headers.forEach((header, index) => {
			percents[header] = shares[index]!;
		});
		return percents;
	}

	static percentsFor(headers: string[], stored: ColumnWidths): number[] | null {
		const known = headers.filter((header) => stored[header] !== undefined);
		if (known.length === 0) return null;
		const unknownCount = headers.length - known.length;
		const knownTotal = known.reduce((sum, header) => sum + stored[header]!, 0);
		const share = unknownCount === 0 ? 0 : Math.max(100 - knownTotal, 0) / unknownCount;
		const fallback = unknownCount === 0 ? 0 : Math.max(share, 100 / headers.length / 2);
		const raw = headers.map((header) => stored[header] ?? fallback);
		const total = raw.reduce((sum, value) => sum + value, 0);
		return raw.map((value) => ColumnLayout.round((value / total) * 100));
	}

	private static round(value: number): number {
		return Math.round(value * 1000) / 1000;
	}
}
