import passportJwt from 'passport-jwt';
import config from 'config';

import User from '../../models/User';

const JwtStrategy = passportJwt.Strategy;
const ExtractJwt = passportJwt.ExtractJwt;

const jwt_signature = config.get('jwt_signature');

const options = {
	jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
	secretOrKey: String(jwt_signature),
};

export default new JwtStrategy(options, async (jwt_payload, done) => {
	try {
		const user = await User.findOne({
			_id: jwt_payload.data.userId,
			emailVerified: true,
			isRemoved: false,
		});

		if (!user) {
			return done(null, false);
		}

		return done(null, user.getValidUser());
	} catch (err) {
		return done(err, false);
	}
});