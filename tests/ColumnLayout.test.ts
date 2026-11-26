import { describe, expect, it } from "vitest";
import { ColumnLayout } from "../src/domain/ColumnLayout";

describe("ColumnLayout.moveBorder", () => {
	it("moves width between the two neighbouring columns only", () => {
		expect(ColumnLayout.moveBorder([100, 200, 300], 1, 50, 600)).toEqual([100, 250, 250]);
	});

	it("stops the left column at the minimum width", () => {
		expect(ColumnLayout.moveBorder([100, 200, 300], 0, -500, 600)).toEqual([16, 284, 300]);
	});

	it("stops the right column at the minimum width when the left one grows", () => {
		expect(ColumnLayout.moveBorder([100, 200, 300], 1, 1000, 600)).toEqual([100, 484, 16]);
	});

	it("keeps the total width", () => {
		const moved = ColumnLayout.moveBorder([120, 80, 40], 1, -30, 240);
		expect(moved.reduce((a, b) => a + b, 0)).toBe(240);
	});
});

describe("ColumnLayout.moveBorder on the last border", () => {
	it("narrows the last column alone", () => {
		expect(ColumnLayout.moveBorder([100, 200, 300], 2, -100, 600)).toEqual([100, 200, 200]);
	});

	it("stops the last column at the minimum width", () => {
		expect(ColumnLayout.moveBorder([100, 200, 300], 2, -1000, 600)).toEqual([100, 200, 16]);
	});

	it("does not let the table grow past its container", () => {
		expect(ColumnLayout.moveBorder([100, 200, 200], 2, 500, 600)).toEqual([100, 200, 300]);
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

	it("keeps a table narrower than its container", () => {
		expect(ColumnLayout.percentsFor(["A", "C"], { A: 25, B: 50, C: 25 })).toEqual([25, 25]);
	});

	it("never makes a table wider than its container", () => {
		const percents = ColumnLayout.percentsFor(["A", "B", "C"], { A: 60, B: 60 })!;
		expect(ColumnLayout.sum(percents)).toBeCloseTo(100, 1);
		expect(percents[0]).toBe(percents[1]);
		expect(percents[2]).toBeGreaterThan(0);
	});

	it("converts pixel widths to percents of the container by header", () => {
		expect(ColumnLayout.toPercents(["A", "B"], [50, 150], 400)).toEqual({ A: 12.5, B: 37.5 });
	});
});
