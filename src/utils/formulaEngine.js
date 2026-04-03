import {
  create,
  addDependencies,
  subtractDependencies,
  multiplyDependencies,
  divideDependencies,
  modDependencies,
  roundDependencies,
  ceilDependencies,
  floorDependencies,
  absDependencies,
  minDependencies,
  maxDependencies,
  powDependencies,
  sqrtDependencies,
  logDependencies,
  log10Dependencies,
  sumDependencies,
  meanDependencies,
  medianDependencies,
  piDependencies,
  eDependencies,
  evaluateDependencies,
  parseDependencies,
} from 'mathjs';

const math = create({
  addDependencies,
  subtractDependencies,
  multiplyDependencies,
  divideDependencies,
  modDependencies,
  roundDependencies,
  ceilDependencies,
  floorDependencies,
  absDependencies,
  minDependencies,
  maxDependencies,
  powDependencies,
  sqrtDependencies,
  logDependencies,
  log10Dependencies,
  sumDependencies,
  meanDependencies,
  medianDependencies,
  piDependencies,
  eDependencies,
  evaluateDependencies,
  parseDependencies,
}, {});

// Restrict to safe math functions only
const ALLOWED_FUNCTIONS = new Set([
  'add', 'subtract', 'multiply', 'divide', 'mod',
  'round', 'ceil', 'floor', 'abs', 'min', 'max',
  'pow', 'sqrt', 'log', 'log10',
  'sum', 'mean', 'median',
  'pi', 'e',
]);

/**
 * Evaluate a formula string using column values.
 * 
 * Formula format: uses column names wrapped in curly braces.
 * Example: "{Price} * {Quantity}" or "round({Price} * (1 - {Discount} / 100), 2)"
 * 
 * @param {string} formula - The formula string with {ColumnName} placeholders
 * @param {Object} scope - Map of column names to their numeric values
 * @returns {{ value: string|null, error: string|null }}
 */
export function evaluateFormula(formula, scope = {}) {
  try {
    if (!formula || typeof formula !== 'string') {
      return { value: null, error: 'Empty formula' };
    }

    // Replace {ColumnName} placeholders with scope values
    let expression = formula;
    const placeholderRegex = /\{([^}]+)\}/g;
    const missingColumns = [];

    expression = expression.replace(placeholderRegex, (match, colName) => {
      const trimmedName = colName.trim();
      if (scope[trimmedName] !== undefined && scope[trimmedName] !== null && scope[trimmedName] !== '') {
        const num = parseFloat(scope[trimmedName]);
        return isNaN(num) ? '0' : String(num);
      } else {
        missingColumns.push(trimmedName);
        return '0';
      }
    });

    if (missingColumns.length > 0 && Object.keys(scope).length === 0) {
      return { value: null, error: `Missing columns: ${missingColumns.join(', ')}` };
    }

    // Evaluate using mathjs (safe, no eval)
    const result = math.evaluate(expression);

    if (typeof result === 'number') {
      if (!isFinite(result)) {
        return { value: 'Error', error: 'Result is infinite' };
      }
      // Round to avoid floating point noise
      const rounded = Math.round(result * 1000000) / 1000000;
      return { value: String(rounded), error: null };
    }

    return { value: String(result), error: null };
  } catch (error) {
    return { value: null, error: error.message };
  }
}

/**
 * Validate a formula without evaluating it against real data.
 * Checks syntax and placeholder format.
 * 
 * @param {string} formula - The formula string
 * @param {string[]} availableColumns - List of available column names
 * @returns {{ valid: boolean, error: string|null, referencedColumns: string[] }}
 */
export function validateFormula(formula, availableColumns = []) {
  try {
    if (!formula || typeof formula !== 'string') {
      return { valid: false, error: 'Formula is empty', referencedColumns: [] };
    }

    // Extract referenced column names
    const placeholderRegex = /\{([^}]+)\}/g;
    const referencedColumns = [];
    let match;
    while ((match = placeholderRegex.exec(formula)) !== null) {
      referencedColumns.push(match[1].trim());
    }

    // Check for unknown columns
    if (availableColumns.length > 0) {
      const unknown = referencedColumns.filter(c => !availableColumns.includes(c));
      if (unknown.length > 0) {
        return { valid: false, error: `Unknown columns: ${unknown.join(', ')}`, referencedColumns };
      }
    }

    // Try to parse the formula with dummy values
    let testExpression = formula.replace(placeholderRegex, '1');
    math.parse(testExpression);

    return { valid: true, error: null, referencedColumns };
  } catch (error) {
    return { valid: false, error: `Syntax error: ${error.message}`, referencedColumns: [] };
  }
}

/**
 * Extract column names referenced in a formula.
 * @param {string} formula
 * @returns {string[]}
 */
export function getFormulaColumns(formula) {
  if (!formula) return [];
  const regex = /\{([^}]+)\}/g;
  const cols = [];
  let match;
  while ((match = regex.exec(formula)) !== null) {
    const name = match[1].trim();
    if (!cols.includes(name)) cols.push(name);
  }
  return cols;
}
