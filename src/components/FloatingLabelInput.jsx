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
 * The box keeps the app's original compact py-3 height (not padded out to make room for the
 * label inside it) - the label instead floats up to sit right on the border line, the same
 * `top-1/2 -translate-y-1/2` -> `top-0` trick as the original shadcn demo (with the label's
 * own now-smaller height, `translateY(-50%)` centers it exactly on that line). There's a
 * white background behind the label text so it stays legible crossing the border line, but
 * as a small rounded-full pill (matching the app's status-badge pills elsewhere) instead of
 * a sharp-edged rectangle - it blends invisibly into the input's own white background while
 * resting/centered, and only reads as a distinct little tag once it floats up onto the border.
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
                className="absolute left-3 top-1/2 -translate-y-1/2 cursor-text text-base font-semibold text-gray-400 transition-all duration-150
                    group-focus-within:top-0 group-focus-within:cursor-default group-focus-within:text-[11px] group-focus-within:text-pink-500 group-focus-within:pointer-events-none
                    has-[+input:not(:placeholder-shown)]:top-0 has-[+input:not(:placeholder-shown)]:cursor-default has-[+input:not(:placeholder-shown)]:text-[11px] has-[+input:not(:placeholder-shown)]:text-pink-500 has-[+input:not(:placeholder-shown)]:pointer-events-none"
            >
                <span className="font-['Quicksand'] inline-flex rounded-full bg-white px-2">{label}</span>
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
                className={`font-['Quicksand'] w-full px-4 py-3 rounded-xl border-2 border-pink-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition ${hasEndAdornment ? 'pr-10' : ''}`}
                {...props}
            />
            {endAdornment}
        </div>
    );
};

export default FloatingLabelInput;
