export default function QueryProcessor(query: string): string {
  const q = query || "";
  const lower = q.toLowerCase();

  // Handle queries asking for the largest number in a list, e.g.:
  // "Which of the following numbers is the largest: 19, 27, 44?"
  if (lower.includes("largest") || lower.includes("largest:" ) || /which of the following numbers is the largest/.test(lower)) {
    // Extract comma-separated numbers from the query
    const nums = Array.from(q.matchAll(/-?\d+\.?\d*/g), m => Number(m[0])).filter(n => !Number.isNaN(n));
    if (nums.length) {
      const max = Math.max(...nums);
      if (Math.floor(max) === max) return String(max);
      return String(parseFloat(max.toFixed(10)).toString());
    }
  }

  // Preprocess word-based operators to symbols so expressions like "45 plus 53"
  // become "45 + 53" and can be picked up by the math detector below.
  let preprocess = q
    .replace(/\bplus\b|\badded to\b|\badd\b/gmi, "+")
    .replace(/\bminus\b|\bsubtract(?:ed)?(?: from)?\b|\bsubtracted\b/gmi, "-")
    .replace(/\btimes\b|\bmultiplied by\b|\bmultiply\b/gmi, "*")
    .replace(/\bdivided by\b|\bdivide\b/gmi, "/");

  // First: try to detect simple math expressions inside the query. We look
  // for a contiguous substring that starts with a digit or '(' and contains
  // only digits, parentheses, decimal points and +-*/ operators. Examples:
  // "What is 98 + 52?" -> "98+52" and "What is (2 + 3) * 4?" -> "(2+3)*4"
  const mathCandidateMatch = preprocess.match(/[0-9(][0-9+\-*/().\s]*/);
  if (mathCandidateMatch) {
    // Extract candidate and strip spaces and trailing non-expression characters
    let expr = mathCandidateMatch[0].trim();
    // Remove spaces
    expr = expr.replace(/\s+/g, "");

    // Validate allowed characters
    if (/^[0-9+\-*/().]+$/.test(expr)) {
      try {
        const value = evaluateExpression(expr);
        if (typeof value === 'number' && Number.isFinite(value)) {
          // Format: if integer show without decimals, otherwise trim trailing zeros
          if (Math.floor(value) === value) {
            return String(value);
          }
          return String(parseFloat(value.toFixed(10)).toString());
        }
      } catch (e) {
        // Fall through to other handlers below if parse/eval fails
      }
    }
  }

  // Existing keyword-based responses
  if (lower.includes("shakespeare")) {
    return (
      "William Shakespeare (26 April 1564 - 23 April 1616) was an " +
      "English poet, playwright, and actor, widely regarded as the greatest " +
      "writer in the English language and the world's pre-eminent dramatist."
    );
  }

  if (lower.includes("gameid")) {
    return "5f34a61a";
  }

  if (lower.includes("playerid")) {
    return "97b91e1a";
  }

  // Prefer exact phrasing "your name" for the personal name response used in tests
  if (lower.includes("your name")) {
    return "Rohan";
  }

  if (lower.includes("name")) {
    return "andremildeluxe";
  }

  if (lower.includes("my andrewid")) {
    return "andremil";
  }

  return "";
}

// Evaluate a math expression string safely (supports + - * / and parentheses).
// Uses the shunting-yard algorithm to convert to RPN and then evaluates.
function evaluateExpression(expr: string): number {
  type Token = { type: 'number'; value: number } | { type: 'op'; value: string } | { type: 'paren'; value: string };

  const tokens: Token[] = [];
  let i = 0;
  const len = expr.length;

  while (i < len) {
    const ch = expr[i];
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }

    // Operator
    if (ch === '+' || ch === '*' || ch === '/' || ch === '-') {
      // Handle unary minus: if at start or previous token is an operator or '('
      const prev = tokens.length ? tokens[tokens.length - 1] : null;
      if (ch === '-' && (!prev || (prev.type === 'op' || (prev.type === 'paren' && prev.value === '(')))) {
        // parse number with sign
        let j = i + 1;
        let numStr = '-';
        while (j < len && /[0-9.]/.test(expr[j])) {
          numStr += expr[j];
          j++;
        }
        if (numStr === '-') {
          // Lone minus, treat as operator
          tokens.push({ type: 'op', value: ch });
          i++;
        } else {
          const value = Number(numStr);
          if (Number.isNaN(value)) throw new Error('Invalid number');
          tokens.push({ type: 'number', value });
          i = j;
        }
        continue;
      }

      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    // Number
    if (/[0-9.]/.test(ch)) {
      let j = i;
      let numStr = '';
      while (j < len && /[0-9.]/.test(expr[j])) {
        numStr += expr[j];
        j++;
      }
      const value = Number(numStr);
      if (Number.isNaN(value)) throw new Error('Invalid number');
      tokens.push({ type: 'number', value });
      i = j;
      continue;
    }

    // Unknown char
    throw new Error('Invalid character in expression: ' + ch);
  }

  // Shunting-yard: convert tokens to RPN
  const output: Token[] = [];
  const ops: Token[] = [];

  const precedence = (op: string) => (op === '+' || op === '-' ? 1 : 2);

  for (const t of tokens) {
    if (t.type === 'number') {
      output.push(t);
    } else if (t.type === 'op') {
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (top.type === 'op' && (precedence(top.value) > precedence(t.value) || (precedence(top.value) === precedence(t.value)))) {
          output.push(ops.pop() as Token);
          continue;
        }
        break;
      }
      ops.push(t);
    } else if (t.type === 'paren') {
      if (t.value === '(') ops.push(t);
      else {
        // t.value === ')'
        let popped = ops.pop();
        while (popped && !(popped.type === 'paren' && popped.value === '(')) {
          output.push(popped);
          popped = ops.pop();
        }
        if (!popped) throw new Error('Mismatched parentheses');
      }
    }
  }

  while (ops.length) {
    const popped = ops.pop() as Token;
    if (popped.type === 'paren') throw new Error('Mismatched parentheses');
    output.push(popped);
  }

  // Evaluate RPN
  const stack: number[] = [];
  for (const t of output) {
    if (t.type === 'number') stack.push(t.value);
    else if (t.type === 'op') {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) throw new Error('Invalid expression');
      let res = 0;
      switch (t.value) {
        case '+':
          res = a + b; break;
        case '-':
          res = a - b; break;
        case '*':
          res = a * b; break;
        case '/':
          if (b === 0) throw new Error('Division by zero');
          res = a / b; break;
        default:
          throw new Error('Unknown operator ' + t.value);
      }
      stack.push(res);
    }
  }

  if (stack.length !== 1) throw new Error('Invalid expression');
  return stack[0];
}
