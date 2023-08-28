import express from "express";
import { graphqlHTTP } from "express-graphql";
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLBoolean,
} from "graphql";
import mongoose from "mongoose";

const app = express();
const PORT = process.env.PORT || 4000;

mongoose.connect("mongodb://localhost/todoapp", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// Create Todo model
const TodoModel = mongoose.model("Todo", {
  text: String,
  completed: Boolean,
});

const TodoType = new GraphQLObjectType({
  name: "Todo",
  fields: {
    id: { type: GraphQLString },
    text: { type: GraphQLString },
    completed: { type: GraphQLBoolean },
  },
});

const RootQuery = new GraphQLObjectType({
  name: "RootQueryType",
  fields: {
    todos: {
      type: new GraphQLList(TodoType),
      resolve: async () => {
        const todos = await TodoModel.find();
        return todos;
      },
    },
  },
});

const Mutation = new GraphQLObjectType({
  name: "Mutation",
  fields: {
    createTodo: {
      type: TodoType,
      args: {
        text: { type: new GraphQLNonNull(GraphQLString) },
        completed: { type: new GraphQLNonNull(GraphQLBoolean) },
      },
      resolve: async (_, args) => {
        const newTodo = new TodoModel({
          text: args.text,
          completed: args.completed,
        });
        await newTodo.save();
        return newTodo;
      },
    },
    updateTodo: {
      type: TodoType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        text: { type: GraphQLString },
        completed: { type: GraphQLBoolean },
      },
      resolve: async (_, args) => {
        const updatedTodo = await TodoModel.findByIdAndUpdate(
          args.id,
          { ...args },
          { new: true }
        );
        return updatedTodo;
      },
    },
    deleteTodo: {
      type: GraphQLString,
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_, args) => {
        const result = await TodoModel.findByIdAndDelete(args.id);
        if (result) {
          return `Todo with ID ${args.id} has been deleted`;
        }
        return `Todo with ID ${args.id} not found`;
      },
    },
  },
});

const schema = new GraphQLSchema({
  query: RootQuery,
  mutation: Mutation,
});

app.use(
  "/graphql",
  graphqlHTTP({
    schema,
    graphiql: true,
  })
);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
