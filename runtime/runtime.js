import * as std from 'std';  

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

const __rml_sys_list_addFirst = (value) => {
    return (list) => {
        return [value, ...list]
    }
}

const __rml_sys_list_addLast = (value) => {
    return (list) => {
        return list.concat(value);
    }
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
    let out = "";
    let i = 0;   // position in format string
    let arg = 0; // argument index

    while (i < format.length) {
        let c = format[i];

        if (c === "{") {
            // Escaped {{
            if (format[i + 1] === "{") {
                out += "{";
                i += 2;
                continue;
            }

            // Placeholder {}
            if (format[i + 1] === "}") {
                if (arg >= args.length) {
                    throw new Error("Not enough arguments for format string");
                }
                out += String(args[arg++]);
                i += 2;
                continue;
            }

            // Single { is illegal
            throw new Error("Unmatched '{' in format string");
        }

        if (c === "}") {
            // Escaped }}
            if (format[i + 1] === "}") {
                out += "}";
                i += 2;
                continue;
            }

            // Single } is illegal
            throw new Error("Unmatched '}' in format string");
        }

        // Normal char
        out += c;
        i++;
    }

    console.log(out);
    return new Unit();
}


