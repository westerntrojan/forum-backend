import {
	GraphQLDateTime,
	GraphQLEmail,
	GraphQLURL,
	GraphQLLimitedString,
	GraphQLPassword,
	GraphQLUUID,
} from 'graphql-custom-types';
import path from 'path';
import fs from 'fs';
import moment from 'moment';

import Article from '../models/Article';
import Comment from '../models/Comment';
import User from '../models/User';

interface Articles {
	first: number;
	start: number;
	sort: string;
	sortBy: string;
}

interface AddArticle {
	title: string;
	text: string;
	image?: string;
}

interface EditArticle {
	articleId: string;
	title?: string;
	text?: string;
	image?: string;
	views?: number;
}

interface AddComment {
	articleId: string;
	user: string;
	text: string;
}

export default {
	DateTime: GraphQLDateTime,
	Email: GraphQLEmail,
	URL: GraphQLURL,
	LimitString: new GraphQLLimitedString(2, 12),
	Password: new GraphQLPassword(6, 20),
	UUID: GraphQLUUID,

	Article: {
		user: async (parent: any) => {
			return await User.findById(parent.user);
		},
		comments: async (parent: any) => {
			return await Comment.find({articleId: parent._id});
		},
	},

	Comment: {
		user: async (parent: any) => {
			return await User.findById(parent.user);
		},
	},

	Query: {
		totalArticles: async () => await Article.countDocuments(),
		articles: async (_: any, args: Articles) => {
			if (args.first > 100) {
				throw new Error('Only 100 articles can be requestedat at a time');
			}

			return await Article.find()
				.skip(args.start)
				.limit(args.first)
				.sort([[args.sortBy, args.sort]]);
		},
		article: async (_: any, args: {articleId: string}) => await Article.findById(args.articleId),
	},

	Mutation: {
		addArticle: async (_: any, args: {input: AddArticle}) => {
			return await Article.create(args.input);
		},
		editArticle: async (_: any, args: {input: EditArticle}) => {
			return await Article.findOneAndUpdate(
				{_id: args.input.articleId},
				{$set: args.input},
				{new: true}
			);
		},
		removeArticle: async (_: any, args: {articleId: string}) => {
			return await Article.findOneAndRemove({_id: args.articleId});
		},
		addComment: async (_: any, args: {input: AddComment}, {pubsub}: any) => {
			pubsub.publish('comment-added', {newComment: args.input});
			return await Comment.create(args.input);
		},
		uploadFile: async (_: any, args: any) => {
			const {createReadStream, filename} = await args.file;

			const newFilename = moment().format('DD-MM-YYYY_HH-mm-ss') + path.extname(filename);

			const toPath = path.join(__dirname, '../data', newFilename);
			const stream = createReadStream();

			return new Promise((resolve, reject) => {
				stream
					.pipe(fs.createWriteStream(toPath))
					.on('error', (error: any) => reject(error))
					.on('finish', () => resolve(args.file));
			});
		},
	},

	Subscription: {
		newComment: {
			subscribe: (_: any, args: any, {pubsub}: any) => {
				return pubsub.asyncIterator('comment-added');
			},
		},
	},
};
