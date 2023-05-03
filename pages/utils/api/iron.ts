const ironOptions = {
  cookieName: 'siwe',
  password: process.env.IRON_PASSWORD || 'invalid-password',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};

export default ironOptions;
