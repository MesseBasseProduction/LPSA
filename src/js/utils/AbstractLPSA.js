import Notification from './Notification';


window.notification = new Notification();


class AbstractLPSA {


  /** @summary <h1>Abstract class to encapsulate shared method between LPSA and LPSAML</h1>
   * @author Arthur Beaulieu
   * @since October 2024
   * @description <blockquote>
   * Content several shared methods and attributes to avoid code redundancy
   * </blockquote> */
  constructor() {
    /** @private
     * @member {String} - The LPSA application version */
    this._version = '0.1.1';

    // ----- Class internals
    /** @private
     * @member {Object} - The aside's scrollbar */
    this._asideScroll = null; // Scrollbar inside aside
    /** @private
     * @member {Object} - The drag and drop controller to handle JSON dropping */
    this._dndController = null; // Handle db drag'n'drop into UI
    /** @private
     * @member {Object} - The loaded database */
    this._db = null; // Session database
  }


  // ---- App initialization sequence


  /** @method
   * @name _initApp
   * @static
   * @memberof AbstractLPSA
   * @description <blockquote>
   * To be overriden in child class. Does nothing.
   * </blockquote>
   * @returns {Promise} Must return a Promise */
  _initApp() {
    // Must be overrien in child class
  }


  /** @method
   * @name _events
   * @static
   * @memberof AbstractLPSA
   * @description <blockquote>
   * To be overriden in child class. Does nothing.
   * </blockquote>
   * @returns {Promise} Must return a Promise */
  _events() {
    // Aside inputs
    document.querySelector('#aside-toggle').addEventListener('click', this._toggleAside.bind(this));
    document.querySelector('#db-add').addEventListener('click', this._requestNewElement.bind(this));
    document.querySelector('#db-save').addEventListener('click', this._exportDatabase.bind(this));
    document.querySelector('#db-erase').addEventListener('click', this._clearDatabaseModal.bind(this));
    // Blur modal event
    document.querySelector('#info-button').addEventListener('click', this._infoModal.bind(this));
    document.querySelector('#modal-overlay').addEventListener('click', this._closeModal.bind(this));
  }


  /** @method
   * @name _finalizeInit
   * @static
   * @memberof AbstractLPSA
   * @description <blockquote>
   * Removes the loading overlay so that the app become visible and usable.
   * </blockquote>
   * @returns {Promise} Promise that is resolved when view is ready, rejected otherwise */
  _finalizeInit() {
    return new Promise((resolve, reject) => {
      try {
        document.querySelector('#loading-overlay').style.opacity = 0;
        setTimeout(() => {
          document.querySelector('#loading-overlay').style.display = 'none';
          resolve();
        }, 500); // Match animation duration in scss file
      } catch (error) {
        reject(error);
      }
    });
  }


  // ----- Input event callbacks


  /** @method
   * @name _toggleAside
   * @static
   * @memberof AbstractLPSA
   * @description <blockquote>
   * Either opens or closes the aside displaying the database values, depending of its current expand/collapse state.
   * </blockquote> */
  _toggleAside() {
    if (document.getElementById('bd-viewer').classList.contains('opened')) {
      document.getElementById('aside-toggle').innerHTML = '&rsaquo;';
      document.getElementById('bd-viewer').classList.remove('opened');
    } else {
      document.getElementById('aside-toggle').innerHTML = '&lsaquo;';
      document.getElementById('bd-viewer').classList.add('opened');
    }
  }


  // ----- Local database handler (all allowed data manipulation)


  /** @method
   * @name _fillDatabase
   * @static
   * @memberof AbstractLPSA
   * @description <blockquote>
   * To be overriden in child class. Does nothing.
   * </blockquote> */
  _fillDatabase() {
    // Must be overrien in child class
  }



  /** @method
   * @name _requestNewElement
   * @static
   * @memberof AbstractLPSA
   * @description <blockquote>
   * To be overriden in child class. Does nothing.
   * </blockquote> */
   _requestNewElement() {
    // Must be overrien in child class
  }


  /** @method
   * @name _exportDatabase
   * @static
   * @memberof AbstractLPSA
   * @description <blockquote>
   * To be overriden in child class. Does nothing.
   * </blockquote> */
  _exportDatabase() {
    // Must be overrien in child class
  }


  /** @method
   * @name _clearDatabase
   * @static
   * @memberof AbstractLPSA
   * @description <blockquote>
   * To be overriden in child class. Does nothing.
   * </blockquote> */
  _clearDatabase() {
    // Must be overrien in child class
  }


  // ----- Modal related methods


  /** @method
   * @name _clearDatabaseModal
   * @static
   * @memberof AbstractLPSA
   * @description <blockquote>
   * Acts like a confirm dialog before erasing the session database. Also provides a button to export locally the database.
   * </blockquote> */
   _clearDatabaseModal() {
    if (this._db === null) {
      this._clearDatabase();
      return;
    }
    const overlay = document.getElementById('modal-overlay');
    // Open modal event
    fetch(`assets/html/cleardatabasemodal.html`).then(data => {
      overlay.style.display = 'flex';
      data.text().then(htmlString => {
        const container = document.createRange().createContextualFragment(htmlString);
        overlay.appendChild(container);
        overlay.querySelector('#save-button').addEventListener('click', () => {
          this._exportDatabase();
          this._closeModal({ srcElement: { id: 'close-button' }});
        });
        overlay.querySelector('#confirm-button').addEventListener('click', () => {
          this._clearDatabase();
          this._closeModal({ srcElement: { id: 'close-button' }});
        });
        setTimeout(() => overlay.style.opacity = 1, 50);
      });
    }).catch(e => console.error(e));
  }


  /** @method
   * @name _infoModal
   * @static
   * @memberof AbstractLPSA
   * @description <blockquote>
   * Generic information about the website.
   * </blockquote> */
  _infoModal() {
    const overlay = document.getElementById('modal-overlay');
    // Open modal event
    fetch(`assets/html/infomodal.html`).then(data => {
      overlay.style.display = 'flex';
      data.text().then(htmlString => {
        const container = document.createRange().createContextualFragment(htmlString);
        overlay.appendChild(container);
        overlay.querySelector('#app-version').innerHTML = this._version;
        setTimeout(() => overlay.style.opacity = 1, 50);
      });
    }).catch(e => console.error(e));
  }


  /** @method
   * @name _closeModal
   * @static
   * @memberof AbstractLPSA
   * @description <blockquote>
   * Method to request a modal closure.
   * </blockquote>
   * @param {vent} e - The associated click event */
  _closeModal(e) {
    if (e.srcElement.id !== 'modal-overlay' && e.srcElement.className !== 'close-modal' && e.srcElement.id !== 'close-button') {
      return;
    }

    const overlay = document.getElementById('modal-overlay');
    if (overlay.style.display === 'flex') {
      overlay.style.opacity = 0;
      setTimeout(() => {
        overlay.innerHTML = '';
        overlay.style = '';
      }, 400);
    }
  }


}


export default AbstractLPSA;
