import { describe, expect, it } from "vitest";
import { ColumnLayout } from "../src/domain/ColumnLayout";

describe("ColumnLayout.moveBorder", () => {
	it("moves width between the two neighbouring columns only", () => {
		expect(ColumnLayout.moveBorder([100, 200, 300], 1, 50)).toEqual([100, 250, 250]);
	});

	it("stops the left column at the minimum width", () => {
		expect(ColumnLayout.moveBorder([100, 200, 300], 0, -500)).toEqual([16, 284, 300]);
	});

	it("stops the right column at the minimum width when the left one grows", () => {
		expect(ColumnLayout.moveBorder([100, 200, 300], 1, 1000)).toEqual([100, 484, 16]);
	});

	it("keeps the total width", () => {
		const moved = ColumnLayout.moveBorder([120, 80, 40], 1, -30);
		expect(moved.reduce((a, b) => a + b, 0)).toBe(240);
	});
});

describe("ColumnLayout.percentsFor", () => {
	it("returns null when nothing is stored for these columns", () => {
		expect(ColumnLayout.percentsFor(["A", "B"], { C: 50 })).toBeNull();
	});

	it("uses stored percents for known columns", () => {
		expect(ColumnLayout.percentsFor(["A", "B"], { A: 30, B: 70 })).toEqual([30, 70]);
	});

	it("shares what is left between new columns", () => {
		expect(ColumnLayout.percentsFor(["A", "B", "C"], { A: 40, B: 20 })).toEqual([40, 20, 40]);
	});

	it("keeps a removed column from leaving a gap", () => {
		expect(ColumnLayout.percentsFor(["A", "C"], { A: 25, B: 50, C: 25 })).toEqual([50, 50]);
	});

	it("converts pixel widths to percents by header", () => {
		expect(ColumnLayout.toPercents(["A", "B"], [50, 150])).toEqual({ A: 25, B: 75 });
	});
});
