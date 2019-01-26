import Search from './models/Search';
import List from './models/List';
import Recipe from './models/Recipe';
import Likes from './models/Likes';
import * as searchView from './views/searchView';
import * as recipeView from './views/recipeView';
import * as listView from './views/listView';
import * as likesView from './views/likesView';
import * as base from './views/base';


/*

 Global state
- Search object
- Current recipe object
- Shopping list object
- Liked recipes

*/
const state = {};

// SEACRH

const controlSearch = async () => {
    // 1. Get the query from the view
    const query = searchView.getInput(); 

    if(query) {
        // 2. Create new Search object and add it to the state
        state.search = new Search(query);

        // 3. Prepare Ui (clear the prev result, etc)
        searchView.clearResults();
        searchView.clearInput();
        base.renderLoader(base.elements.searchRes);

        // 4. Search for recipes
        try {
            await state.search.getResults();

            // 5. Render results on UI
            base.clearLoader();
            searchView.renderResults(state.search.result);
        } catch (error) {
            alert('Something wrong with search!');
            base.clearLoader();
        }
    }
}

base.elements.searchForm.addEventListener('submit', event => {
    event.preventDefault();
    controlSearch();
});

base.elements.searchResPages.addEventListener('click', event => {
    const btn = event.target.closest('.btn-inline');
    if (btn) {
        const goToPage = parseInt(btn.dataset.goto, 10);
        searchView.clearResults();
        searchView.renderResults(state.search.result, goToPage);
    }
})


// RECIPE

const controlRecipe = async () => {
    // Get ID from url
    const id = window.location.hash.replace('#', '');

    if (id) {
        // Prepare UI for changes
        recipeView.clearRecipe();
        base.renderLoader(base.elements.recipe);

        // Highlight selected search item
        if (state.search) searchView.highlightSelected(id);

        // Create new Recipe obj
        state.recipe = new Recipe(id);

        // Get recipe data
        try {
            await state.recipe.getRecipe();
            state.recipe.parseIngredients();
            // Calculate time and servings
            state.recipe.calcServings();
            state.recipe.calcTime();
            // Render recipe
            base.clearLoader()
            recipeView.renderRecipe(state.recipe, state.likes.isLiked(id));
        } catch (error) {
            alert('Error processing recipe!');
            console.log(error);
        }
    }
};

['hashchange', 'load'].forEach(event => window.addEventListener(event, controlRecipe));


// LIST CONTROLLER

const controlList = () => {
    // Create a new list if there is none yet
    if (!state.list) state.list = new List();

    // Add each ing to the list and UI
    state.recipe.ingredients.forEach(el => {
        const item = state.list.addItem(el.count, el.unit, el.ingredient);
        listView.renderItem(item);
    });
}

// Deleting and updating events
base.elements.shopping.addEventListener('click', e => {
    const id = e.target.closest('.shopping__item').dataset.itemid;

    // Delete button
    if (e.target.matches('.shopping__delete, .shopping__delete *')) {
        // Delete from state
        state.list.deleteItem(id);
        // Delete from UI 
        listView.deleteItem(id);
    } else if (e.target.matches('.shopping__count-value')) {
        const val = parseFloat(e.target.value);
        state.list.updateCount(id, val);
    }
})


// LIKE CONTROLLER


const controlLike = () => {
    if (!state.likes) state.likes = new Likes();
    const currentID = state.recipe.id;
    if (!state.likes.isLiked(currentID)) {
        // Not liked yet 
        // Add like to the state
        const newLike = state.likes.addLike(currentID, state.recipe.title, state.recipe.author, state.recipe.image);

        // Toggle the button
        likesView.toggleLikeBtn(true);

        // Add like to the UI
        likesView.renderLike(newLike);
    } else {
        // Liked already
        // Remove from the state
        state.likes.deleteLike(currentID);
        
        // Toggle the button
        likesView.toggleLikeBtn(false);

        // Remove like from the UI
        likesView.deleteLike(currentID);
    }
    likesView.toggleLikeMenu(state.likes.getNumLikes());
}

// Restore liked recipes on page load
window.addEventListener('load', () => {
    state.likes = new Likes();
    //Restore likes
    state.likes.readStorage();
    // Toggle button
    likesView.toggleLikeMenu(state.likes.getNumLikes());

    // Render the likes
    state.likes.likes.forEach(like => likesView.renderLike(like));

});

base.elements.recipe.addEventListener('click', e => {
    if (e.target.matches('.btn-decrease, .btn-decrease *')) {
        // Decrease button is clicked
        if (state.recipe.servings > 1) {
            state.recipe.updateServings('dec');
            recipeView.updateServingsIngredients(state.recipe);
        }
    } else if (e.target.matches('.btn-increase, .btn-increase *')) {
        // Increase is clicked
        state.recipe.updateServings('inc');
        recipeView.updateServingsIngredients(state.recipe);
    } else if (e.target.matches('.recipe__btn--add, .recipe__btn--add *')) {
        // Add ingredients to the shopping list
        controlList();
    } else if (e.target.matches('.recipe__love, .recipe__love *')) {
        // Like controller
        controlLike();
    }
});
