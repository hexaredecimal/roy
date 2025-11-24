import * as std from 'std';  
import * as os from 'os';

// Numeric Operations
const __op_add_Number_Number_Number = (a) => {
    return (b) => {
        return a + b;
    }
}

const __op_sub_Number_Number_Number = (a) => {
    return (b) => {
        return a - b;
    }
}

const __op_sub_Number_Number = (a) => {
    return -a;
}

const __op_mul_Number_Number_Number = (a) => {
    return (b) => {
        return a * b;
    }
}

const __op_div_Number_Number_Number = (a) => {
    return (b) => {
        return a / b;
    }
}

const __op_mod_Number_Number_Number = (a) => {
    return (b) => {
        return a % b;
    }
}

// Comparison Operations

const __op_eq_eq__a__b_Boolean = (a) => {
    return (b) => {
        return a === b;
    }
}

const __op_not_eq__e__f_Boolean = (a) => {
    return (b) => {
        return a != b;
    }
}

const __op_gt_Number_Number_Boolean = (a) => {
    return (b) => {
        return a > b;
    }
}

const __op_lt_Number_Number_Boolean = (a) => {
    return (b) => {
        return a < b;
    }
}

const __op_gt_eq_Number_Number_Boolean = (a) => {
    return (b) => {
        return a >= b;
    }
}

const __op_lt_eq_Number_Number_Boolean = (a) => {
    return (b) => {
        return a <= b;
    }
}

// String concat

const __op_add_add_String_String_String = (a) => {
    return (b) => {
        return a + b;
    }
}

// Array indexing

const __op_at__i_Number_j = (a) => {
    return (b) => {
        return a[b];
    }
}

// Dynamic Arrays (Lists)

const __rml_sys_list_add = (value, list) => {
    return  [value, ...list];
}

const __rml_sys_list_reduce = (func, def, list) => {
    return list.reduce(func, def);
}



// Unit
function Unit() {
    this.$name = "Unit";
}

// Utils

function __rml_toString(value) {
  return String(value)
}

function __rml_string_size(str) {
  return str.length;
}

// ref
// toRef
function __op_and_(val) {
  return {inner: val};
}

function __op_mul_({inner: val}) {
  return val;
}

const __op_eq_ = (ref) => {
    return (val) => {
      ref.inner = val;
      return ref;
    }
}



// Stddout
function __rml_print(value) {
    std.out.puts(String(value))
    return new Unit();
}

function __rml_println(value) {
    console.log(value)
    return new Unit();
}

function __rml_printf(format, args) {
    std.out.puts(__rml_string_fmt(format, args));
    return new Unit();
}

function __rml_string_fmt(format, args) {
    var out = "";
    var i = 0;
    var arg = 0;

    function isDigit(ch) {
        return ch >= "0" && ch <= "9";
    }

    function parseSpec(spec) {
        // returns { fill, align, width, precision, type }
        var fill = " ";
        var align = ""; // "<", ">", "^" or ""
        var width = null;
        var precision = null;
        var type = null;

        if (!spec || spec.length === 0) {
            return { fill: fill, align: align, width: width, precision: precision, type: type };
        }

        var p = 0;
        // Check for [fill][align] where align is one of < ^ >
        if (spec.length >= 2 && (spec[1] === "<" || spec[1] === ">" || spec[1] === "^")) {
            fill = spec[0];
            align = spec[1];
            p = 2;
        } else if (spec[0] === "<" || spec[0] === ">" || spec[0] === "^") {
            align = spec[0];
            p = 1;
        } else if (spec[0] === "0") {
            // common shorthand: 08X -> zero-fill, right align
            fill = "0";
            align = ">";
            // don't advance p here; treat the '0' as part of width parsing below
        }

        // parse width (digits) until '.' or non-digit (could be type letter)
        var startWidth = p;
        while (p < spec.length && isDigit(spec[p])) {
            p++;
        }
        if (p > startWidth) {
            width = parseInt(spec.slice(startWidth, p), 10);
        }

        // precision
        if (p < spec.length && spec[p] === ".") {
            p++;
            var startPrec = p;
            while (p < spec.length && isDigit(spec[p])) p++;
            if (p > startPrec) {
                precision = parseInt(spec.slice(startPrec, p), 10);
            } else {
                precision = 0;
            }
        }

        // remaining single letter is type (if present)
        if (p < spec.length) {
            type = spec[p];
            // ignore anything after the type
        }

        return { fill: fill, align: align, width: width, precision: precision, type: type };
    }

    function applyFormat(value, spec) {
        if (value === undefined || value === null) value = "";

        var cfg = parseSpec(spec || "");
        var s;

        // If type present, do numeric conversions where appropriate.
        if (cfg.type) {
            var t = cfg.type;
            if (t === "x" || t === "X" || t === "b" || t === "o") {
                // treat as integer conversion
                var n = Number(value);
                if (isNaN(n)) {
                    s = String(value);
                } else {
                    // truncate toward zero for safety like typical formatting
                    n = Math.floor(Math.abs(n)) * (n < 0 ? -1 : 1);
                    if (t === "x") s = n.toString(16);
                    if (t === "X") s = n.toString(16).toUpperCase();
                    if (t === "b") s = n.toString(2);
                    if (t === "o") s = n.toString(8);
                }
            } else if (t === "f") {
                var prec = (cfg.precision !== null) ? cfg.precision : 6;
                var nf = Number(value);
                if (isNaN(nf)) {
                    s = String(value);
                } else {
                    s = nf.toFixed(prec);
                }
            } else {
                // unknown type: fallback to string
                s = String(value);
            }
        } else {
            // no type: just string form
            s = String(value);
            // if precision provided but no type, we can treat it as max length (optional)
            if (cfg.precision !== null) {
                // behave like substring for strings
                s = s.slice(0, cfg.precision);
            }
        }

        // width and alignment/padding
        if (cfg.width !== null && cfg.width > 0) {
            var w = cfg.width;
            if (s.length < w) {
                var padLen = w - s.length;
                var pad = (cfg.fill === undefined ? " " : cfg.fill).repeat(padLen);
                var a = cfg.align;
                if (a === ">") {
                    s = pad + s;
                } else if (a === "<") {
                    s = s + pad;
                } else if (a === "^") {
                    var left = Math.floor(padLen / 2);
                    var right = padLen - left;
                    s = (cfg.fill.repeat(left)) + s + (cfg.fill.repeat(right));
                } else {
                    // default is right align if fill is '0' (common case), otherwise left? Python default is right for numbers,
                    // but here default to right if fill is '0', else left to match intuitive behavior.
                    if (cfg.fill === "0") s = pad + s;
                    else s = s + pad;
                }
            }
        }

        return s;
    }

    while (i < format.length) {
        var c = format[i];

        if (c === "{") {
            // escaped {{
            if (i + 1 < format.length && format[i + 1] === "{") {
                out += "{";
                i += 2;
                continue;
            }

            // find matching }
            var end = format.indexOf("}", i + 1);
            if (end === -1) throw new Error("Unmatched '{' in format string");

            var inside = format.substring(i + 1, end);

            // empty {}
            if (inside === "") {
                if (arg >= args.length) throw new Error("Not enough arguments");
                out += String(args[arg++]);
                i = end + 1;
                continue;
            }

            // spec form {:spec}
            if (inside[0] === ":") {
                var spec = inside.substring(1);
                if (arg >= args.length) throw new Error("Not enough arguments");
                out += applyFormat(args[arg++], spec);
                i = end + 1;
                continue;
            }

            // not supported other forms yet (like {0} or {name})
            throw new Error("Invalid placeholder {" + inside + "}");
        }

        if (c === "}") {
            // escaped }}
            if (i + 1 < format.length && format[i + 1] === "}") {
                out += "}";
                i += 2;
                continue;
            }
            throw new Error("Unmatched '}' in format string");
        }

        out += c;
        i++;
    }

    return out;
}


// Stdlib support

function __rml_get_env(value) {
    const val = std.getenv(value);
    if (val) return new Some(val);
    return new None();
}

function __rml_set_env(value) {
    std.setenv(value);
    return new Unit();
}

function __rml_open(filename, flags) {
    const a = os.open(filename, flags);
    if (a < 0) return new None()
    return new Some(a);
}

function __rml_read_to_string(filename) {
    const a = std.loadFile("file.txt"); 
    if (!a) return new None()
    return new Some(a);
}

function __rml_remove(filename) {
    const a = os.remove(filename);
    if (a < 0) return new Err(`Error: ${a * -1}`);
    return new Ok(new Unit());
}

function __rml_rename(oldName, newName) {
    const a = os.rename(oldName, newName);
    if (a < 0) return new Err(`Error: ${a * -1}`);
    return new Ok(new Unit());
}

function __rml_cwd() {
    return os.cwd(oldName, newName);
}

function __rml_get_platform() {
    return os.platform;
}


