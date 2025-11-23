const User = require('./User');
const Restriction = require('./Restriction');
const UserRestriction = require('./UserRestriction');
const Recipe = require('./Recipe');
const RecipeRestriction = require('./RecipeRestriction');
const RecipeRating = require('./RecipeRating');
const RecipeFavorite = require('./RecipeFavorite');

// Relacionamentos User
User.hasMany(Recipe, { foreignKey: 'user_id', as: 'recipes' });
User.hasMany(RecipeRating, { foreignKey: 'user_id', as: 'ratings' });
User.hasMany(RecipeFavorite, { foreignKey: 'user_id', as: 'favorites' });
User.belongsToMany(Restriction, {
  through: UserRestriction,
  foreignKey: 'user_id',
  otherKey: 'restriction_id',
  as: 'restrictions'
});

RecipeRestriction.belongsTo(Restriction, { 
  foreignKey: 'restriction_id', 
  as: 'restriction' 
});

Restriction.hasMany(RecipeRestriction, { 
  foreignKey: 'restriction_id', 
  as: 'recipeRestrictions' 
});

// Relacionamentos Restriction
Restriction.belongsToMany(User, {
  through: UserRestriction,
  foreignKey: 'restriction_id',
  otherKey: 'user_id',
  as: 'users'
});

// Relacionamentos Recipe
Recipe.belongsTo(User, { foreignKey: 'user_id', as: 'author' });
Recipe.hasMany(RecipeRestriction, { foreignKey: 'recipe_id', as: 'restrictions' });
Recipe.hasMany(RecipeRating, { foreignKey: 'recipe_id', as: 'ratings' });
Recipe.hasMany(RecipeFavorite, { foreignKey: 'recipe_id', as: 'favorites' });
Recipe.belongsToMany(User, {
  through: RecipeFavorite,
  foreignKey: 'recipe_id',
  otherKey: 'user_id',
  as: 'favoritedBy'
});

// Relacionamentos RecipeRestriction
RecipeRestriction.belongsTo(Recipe, { foreignKey: 'recipe_id', as: 'recipe' });
// Nota: recipe_restrictions não tem FK para restrictions, apenas armazena ingrediente_restritivo e palavras_chave

// Relacionamentos RecipeRating
RecipeRating.belongsTo(Recipe, { foreignKey: 'recipe_id', as: 'recipe' });
RecipeRating.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Relacionamentos RecipeFavorite
RecipeFavorite.belongsTo(Recipe, { foreignKey: 'recipe_id', as: 'recipe' });
RecipeFavorite.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Relacionamentos UserRestriction
UserRestriction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserRestriction.belongsTo(Restriction, { foreignKey: 'restriction_id', as: 'restriction' });

module.exports = {
  User,
  Restriction,
  UserRestriction,
  Recipe,
  RecipeRestriction,
  RecipeRating,
  RecipeFavorite
};
