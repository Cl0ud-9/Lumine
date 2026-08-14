import { useId } from 'react';

/**
 * Text input with an animated floating label. Detection is pure CSS, no React state:
 * `group-focus-within:` (via the `group` class on the wrapper) covers the focused case,
 * and `has-[+input:not(:placeholder-shown)]:` covers "has a value" - `:placeholder-shown`
 * only matches an empty input, so `:not(...)` means something's actually typed in it.
 *
 * Important: the label must come BEFORE the input in the JSX. `has-[+input]` only matches
 * a label whose *next* sibling is the input - if the order is reversed, that half of the
 * detection silently never fires (the label then only ever reacts to live focus, and drops
 * back down over the value the moment the field is blurred).
 *
 * The label floats to a small caption inside the input's own top padding rather than
 * crossing/masking the border (the "notch cut into the border" look from the original
 * shadcn demo) - that version needs an opaque patch behind the label to hide the border
 * line, which looks fine on shadcn's flat neutral cards but visibly clashes with this
 * app's soft rounded/glass aesthetic. Floating label inside the field's own padding needs
 * no such patch and works against any background.
 *
 * `endAdornment` accepts something like a show/hide-password icon button - pass
 * `hasEndAdornment` too so the input reserves room for it (the existing pr-10 pattern).
 */
const FloatingLabelInput = ({
    label,
    type = 'text',
    value,
    onChange,
    required = false,
    name,
    autoComplete,
    endAdornment = null,
    hasEndAdornment = false,
    className = '',
    ...props
}) => {
    const id = useId();

    return (
        <div className={`group relative ${className}`}>
            <label
                htmlFor={id}
                className="font-['Quicksand'] absolute left-4 top-1/2 -translate-y-1/2 cursor-text text-base font-semibold text-gray-400 transition-all duration-150
                    group-focus-within:top-2.5 group-focus-within:translate-y-0 group-focus-within:cursor-default group-focus-within:text-[11px] group-focus-within:text-pink-500 group-focus-within:pointer-events-none
                    has-[+input:not(:placeholder-shown)]:top-2.5 has-[+input:not(:placeholder-shown)]:translate-y-0 has-[+input:not(:placeholder-shown)]:cursor-default has-[+input:not(:placeholder-shown)]:text-[11px] has-[+input:not(:placeholder-shown)]:text-pink-500 has-[+input:not(:placeholder-shown)]:pointer-events-none"
            >
                {label}
            </label>
            <input
                id={id}
                type={type}
                value={value}
                onChange={onChange}
                required={required}
                name={name}
                autoComplete={autoComplete}
                placeholder=" "
                className={`font-['Quicksand'] w-full px-4 pt-5 pb-2 rounded-xl border-2 border-pink-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition ${hasEndAdornment ? 'pr-10' : ''}`}
                {...props}
            />
            {endAdornment}
        </div>
    );
};

export default FloatingLabelInput;
