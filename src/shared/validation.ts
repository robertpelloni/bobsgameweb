/**
 * Input validation utilities for public API methods.
 *
 * Provides runtime validation for:
 * - String inputs (length, pattern, sanitization)
 * - Numeric inputs (range, integer, finite)
 * - Object inputs (shape, required fields)
 * - Array inputs (length, element types)
 *
 * Usage:
 *   const name = validateString(input, "name", { minLength: 1, maxLength: 32 });
 *   const level = validateInt(input, "level", { min: 1, max: 20 });
 *   const opts = validateObject(input, "options", { required: ["name"] });
 */

export interface StringValidation {
	minLength?: number;
	maxLength?: number;
	pattern?: RegExp;
	allowEmpty?: boolean;
	trim?: boolean;
}

export interface NumberValidation {
	min?: number;
	max?: number;
	integer?: boolean;
	finite?: boolean;
	positive?: boolean;
}

export interface ObjectValidation {
	required?: string[];
	optional?: string[];
}

export class ValidationError extends Error {
	public field: string;
	public rule: string;

	constructor(field: string, rule: string, message: string) {
		super(message);
		this.field = field;
		this.rule = rule;
		this.name = "ValidationError";
	}
}

/**
 * Validate a string input.
 * @throws ValidationError if validation fails
 */
export function validateString(value: unknown, field: string, opts: StringValidation = {}): string {
	if (typeof value !== "string") {
		throw new ValidationError(field, "type", `${field} must be a string, got ${typeof value}`);
	}

	let str = opts.trim !== false ? value.trim() : value;

	if (!opts.allowEmpty && str.length === 0) {
		throw new ValidationError(field, "empty", `${field} cannot be empty`);
	}

	if (opts.minLength !== undefined && str.length < opts.minLength) {
		throw new ValidationError(field, "minLength", `${field} must be at least ${opts.minLength} characters`);
	}

	if (opts.maxLength !== undefined && str.length > opts.maxLength) {
		throw new ValidationError(field, "maxLength", `${field} must be at most ${opts.maxLength} characters`);
	}

	if (opts.pattern && !opts.pattern.test(str)) {
		throw new ValidationError(field, "pattern", `${field} does not match required pattern`);
	}

	return str;
}

/**
 * Validate a numeric input.
 * @throws ValidationError if validation fails
 */
export function validateNumber(value: unknown, field: string, opts: NumberValidation = {}): number {
	if (typeof value !== "number") {
		throw new ValidationError(field, "type", `${field} must be a number, got ${typeof value}`);
	}

	if (opts.finite !== false && !Number.isFinite(value)) {
		throw new ValidationError(field, "finite", `${field} must be finite`);
	}

	if (opts.integer && !Number.isInteger(value)) {
		throw new ValidationError(field, "integer", `${field} must be an integer`);
	}

	if (opts.positive && value <= 0) {
		throw new ValidationError(field, "positive", `${field} must be positive`);
	}

	if (opts.min !== undefined && value < opts.min) {
		throw new ValidationError(field, "min", `${field} must be >= ${opts.min}`);
	}

	if (opts.max !== undefined && value > opts.max) {
		throw new ValidationError(field, "max", `${field} must be <= ${opts.max}`);
	}

	return value;
}

/**
 * Validate an integer input (convenience wrapper).
 */
export function validateInt(value: unknown, field: string, opts: Omit<NumberValidation, "integer"> = {}): number {
	return validateNumber(value, field, { ...opts, integer: true });
}

/**
 * Validate an object input has required and optional fields.
 * @throws ValidationError if validation fails
 */
export function validateObject(value: unknown, field: string, opts: ObjectValidation = {}): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new ValidationError(field, "type", `${field} must be an object`);
	}

	const obj = value as Record<string, unknown>;

	if (opts.required) {
		for (const key of opts.required) {
			if (!(key in obj)) {
				throw new ValidationError(field, "required", `${field} is missing required field: ${key}`);
			}
		}
	}

	// Check for unexpected fields if optional is specified
	if (opts.optional && opts.required) {
		const allowed = new Set([...opts.required, ...opts.optional]);
		for (const key of Object.keys(obj)) {
			if (!allowed.has(key)) {
				throw new ValidationError(field, "unexpected", `${field} has unexpected field: ${key}`);
			}
		}
	}

	return obj;
}

/**
 * Validate an array input.
 * @throws ValidationError if validation fails
 */
export function validateArray(value: unknown, field: string, opts: { minLength?: number; maxLength?: number } = {}): unknown[] {
	if (!Array.isArray(value)) {
		throw new ValidationError(field, "type", `${field} must be an array`);
	}

	if (opts.minLength !== undefined && value.length < opts.minLength) {
		throw new ValidationError(field, "minLength", `${field} must have at least ${opts.minLength} elements`);
	}

	if (opts.maxLength !== undefined && value.length > opts.maxLength) {
		throw new ValidationError(field, "maxLength", `${field} must have at most ${opts.maxLength} elements`);
	}

	return value;
}

/**
 * Sanitize a string for safe display (remove HTML tags).
 */
export function sanitizeHtml(input: string): string {
	return input
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/**
 * Validate a player name.
 */
export function validatePlayerName(name: unknown): string {
	return validateString(name, "playerName", {
		minLength: 1,
		maxLength: 32,
		pattern: /^[a-zA-Z0-9_\-. ]+$/,
		trim: true,
	});
}

/**
 * Validate a room ID format.
 */
export function validateRoomId(id: unknown): string {
	return validateString(id, "roomId", {
		minLength: 1,
		maxLength: 64,
		pattern: /^[a-zA-Z0-9-]+$/,
	});
}
