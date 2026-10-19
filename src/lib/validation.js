export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_REQUIREMENTS_MESSAGE =
    'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character';

// Any non-alphanumeric, non-space character counts as "special". The previous signup regex
// only accepted @$!%*?& and rejected the whole password if it contained anything else
// (e.g. # - _ .), then blamed the user with a message that didn't mention the real cause.
export const isStrongPassword = (password) =>
    password.length >= MIN_PASSWORD_LENGTH &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9\s]/.test(password);
