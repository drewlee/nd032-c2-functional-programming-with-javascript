let store = Immutable.fromJS({
    active: '',
    rovers: ['Curiosity', 'Opportunity', 'Spirit'],
    roverImages: [],
    roverAttributes: {},
});

const updateStore = (store, newState) => {
    store = store.merge(newState);
    render(root, store);
};

// Add our markup to the page
const root = document.getElementById('root');

const render = (root, state) => {
    root.innerHTML = App(state);
};

window.addEventListener('DOMContentLoaded', () => render(root, store));


// Create content
const App = (state) => {
    const rovers = state.get('rovers');
    const activeLink = state.get('active');
    const roverAttributes = state.get('roverAttributes');
    const roverImages = state.get('roverImages');

    return (`
        <header class="global-head">
            <h1 class="global-head-logo">
                <strong>NASA</strong> Rover Explorer
            </h1>
            <nav class="global-head-nav">
                <ul>
                    ${RoverLinks(rovers, activeLink)}
                </ul>
            </nav>
        </header>
        <main>
            ${RoverAttributes(roverAttributes)}
            ${RoverImages(roverImages)}
        </main>
    `);
};


// UTILITY FUNCTIONS
/**
 * A higher-order function that prevents multiple calls of the provided function until the initial call has resolved.
 *
 * @param {Function} callback 
 * @returns {Function}
 */
const cullExecutionUntilResolved = (callback) => {
    let isResolved = true;

    return async function() {
        if (isResolved) {
            isResolved = false;
            await callback(...arguments);
            isResolved = true;
        }
    }
};

/**
 * Returns a user friendly readable date from the provided YYYY-MM-DD format.
 *
 * @param {String} date
 * @returns {String}
 */
const dateToText = (date) => {
    const parts = date.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const monthNames = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];

    return `${monthNames[month - 1]} ${day}, ${year}`;
};


// COMPONENTS
const RoverLinks = (rovers, activeLink) => {
    return rovers.reduce((markup, rover) => {
        const url = new URL(`#${rover.toLowerCase()}`, document.baseURI);
        const isActive = activeLink === url.href ? ' data-is-active="true"' : '';

        return markup.concat(`
            <li>
                <a href="${url.href}"${isActive}>${rover}</a>
            </li>
        `);
    }, '');
};

const RoverImages = (images) => {
    if (images.size > 0) {
        const listItems = images.reduce((markup, src, idx) => {
            return markup.concat(
                `<li><img src="${src}" alt="Rover image ${idx + 1}"/></li>`
            );
        }, '');

        return (`
            <section class="photos">
                <ul>${listItems}</ul>
            </section>
        `);
    }

    return '<p>Select a link to view images</p>'
};

const RoverAttributes = (attributes) => {
    if (attributes.size > 0) {
        return (`
            <section class="attributes">
                <h2>${attributes.get('name')} Rover</h2>
                <ul>
                    <li>Launch date: ${dateToText(attributes.get('launch_date'))}</li>
                    <li>Landing date: ${dateToText(attributes.get('landing_date'))}</li>
                    <li>Date of last photo transmission: ${dateToText(attributes.get('earth_date'))}</li>
                    <li>Status: ${attributes.get('status')}</li>
                </ul>
            </section>
        `);
    }
    return '';
};


// API CALLS
const makeRequest = async (href, store) => {
    try {
        const res = await fetch(href.replace('#', ''));
        const data = await res.json();

        if (data && data.photos) {
            const { photos } = data;
            const { earth_date, rover } = photos[0];
            const roverImages = photos.map((photo) => photo.img_src);
            const roverAttributes = { earth_date, ...rover };

            updateStore(store, {
                active: href,
                roverImages,
                roverAttributes
            });

            return true;
        }

        throw Error('Resource responded with invalid data');
    } catch (error) {
        console.error(error);
        return false;
    }
};


// EVENTS
// Prevent subsequent fetch requests if one is already in process
const makeCulledRequest = cullExecutionUntilResolved(makeRequest);

root.addEventListener('click', (evt) => {
    const { target } = evt;

    if (target.tagName.toLowerCase() === 'a') {
        evt.preventDefault();

        // Prevent fetch requests for links that are already active
        if (!target.dataset.isActive) {
            makeCulledRequest(target.href, store);
        }
    }
});
