import '../scss/LPSAML.scss';
import AbstractLPSA from './utils/AbstractLPSA';
import DnD from './utils/DnD';
import ScrollBar from './utils/ScrollBar';



class LPSAML extends AbstractLPSA {


  /** @summary <h1>The LPSA ML application class, which handles both UI, modelisation and computing.</h1>
   * @author Arthur Beaulieu
   * @since October 2024
   * @description <blockquote>
   * </blockquote> */
  constructor() {
    super();
    // ----- App performances
    /** @private
     * @member {Object} - Holds the performance timing measures */
    this._perf = {
      db: { 
        parsing: { m1: null, m2: null },
        loading: { m1: null, m2: null }
       }
    };

    // ----- Begin website initialization
    this._initApp()
      .then(this._events.bind(this))
      .then(this._finalizeInit.bind(this))
      .catch(err => {
        window.notification.error({ message: `Erreur fatale à l'initialisation de l'application. Contactez le support` });
        document.getElementById('feedback-label').innerHTML = `Une ereur fatale est survenue à l'initialisation de l'application, aucune fonctionnalité n'est accessible. Contactez le support.`;
        console.error(`LPSA v${this._version} : Erreur fatale à l'initialisation de l'application. Contactez le support en précisant l'erreur suivante :\n`, err);
      });
  }


  // ---- App initialization sequence


  /** @method
   * @name _initApp
   * @static
   * @memberof LPSAML
   * @description <blockquote>
   * Initializes the drag and drop controller over the <main> DOM element, and tries to load a database stored in the local storage.
   * </blockquote>
   * @returns {Promise} Promise that is resolved if DnD controller is properly initialized, rejected otherwise */
  _initApp() {
    return new Promise((resolve, reject) => {
      try {
        this._dndController = new DnD({
          target: '.dnd-container',
          onDropFile: (fileInfo, data) => {
            if (fileInfo.type === 'application/vnd.ms-excel') {
              // If dropped file is a .CSV file, proceed to fill database after parsing CSV
              this._perf.db.parsing.m1 = performance.now();
              const parsedData = DnD.formatCSVAsJSON(data.target.result, ';');
              this._perf.db.parsing.m2 = performance.now();
              console.log(`Base de donnée parcourue en ${((this._perf.db.parsing.m2 - this._perf.db.parsing.m1) / 1000).toFixed(3)} seconde(s).`);
              document.getElementById('feedback-label').innerHTML = `Base de donnée parcourue en ${((this._perf.db.parsing.m2 - this._perf.db.parsing.m1) / 1000).toFixed(3)} seconde(s).`;
              this._fillDatabase({
                version: 1,
                date: (new Date()).toISOString().split('T')[0],
                data: parsedData
              });
            } else if (fileInfo.type === 'application/json') {
              // If dropped file is a .JSON file, proceed to fill database
              this._fillDatabase(DnD.formatAsJSON(data.target.result));
            } else {
              // Notify user that dropped file isn't expected
              window.notification.error({ message: `Format de fichier non pris en charge pour l'import de la base de donnée` });
              document.getElementById('feedback-label').innerHTML = `Le fichier déposé n'est pas au format supporté (.CSV).`;
            }
          }
        });
        // Try to load DB from local storage if any
        const db = window.localStorage.getItem('lpsaml-session-db');
        if (db !== null) {
          this._fillDatabase(JSON.parse(db));
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }


  /** @method
   * @name _events
   * @static
   * @memberof LPSAML
   * @description <blockquote>
   * Allow every user interaction by listening to DOM events on specific UI elements.
   * </blockquote>
   * @returns {Promise} Promise that is resolved if all events are listened, rejected otherwise */
  _events() {
    return new Promise((resolve, reject) => {
      try {
        // Submission
        document.querySelector('#filter-input').addEventListener('click', this._filterDatabase.bind(this));
        // Call for paent class _events
        super._events();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }


  // ----- Input event callbacks


  _filterDatabase(e) {
    // Ensure a db has been dropped first
    if (this._db === null) {
      window.notification.warning({ message: `Aucune base de donnée n'est chargée en mémoire` });
      document.getElementById('feedback-label').innerHTML = `Veuillez d'abord glisser-déposer n'importe ou sur la page le JSON de données.`;
      e.target.blur();
      return;
    }
    const output = [];
    for (let i = 0; i < this._db.data.length; ++i) {
      if (this._db.data[i][6] === 0) {
        // No winner
        if (this._db.data[i][4] < this._db.data[i][3] && this._db.data[i][4] < this._db.data[i][5]) {
          output.push(this._db.data[i]);
        }
      } else if (this._db.data[i][6] === 1) {
        // Home winner
        if (this._db.data[i][3] < this._db.data[i][4] && this._db.data[i][3] < this._db.data[i][5]) {
          output.push(this._db.data[i]);
        }
      } else if (this._db.data[i][6] === 2) {
        // Visitor winner
        if (this._db.data[i][5] < this._db.data[i][4] && this._db.data[i][5] < this._db.data[i][3]) {
          output.push(this._db.data[i]);
        }
      }
    }
    document.getElementById('feedback-label').innerHTML = `Selon le critère de filtrage du plus faible pourcentage qui se réalise, ${output.length} résultat(s) trouvés.`;
  }


  // ----- Local database handler (all allowed data manipulation)


  /** @method
   * @name _fillDatabase
   * @static
   * @memberof LPSAML
   * @description <blockquote>
   * With provided JSON, this method will fill the session database internally and will update the UI aside with this database.
   * </blockquote>
   * @param {Object} json - The database as parsed JSON, must comply with a format that won't be detailled here */
  _fillDatabase(json) {
    // Ensure the JSON data contains what we expect
    if (!json.date || !json.data) {
      window.notification.error({ message: `Le contenu de la base de donnée est mal formaté` });
      document.getElementById('feedback-label').innerHTML = `Le fichier déposé ne contiens pas les données attentudes.`;
      return;
    }
    // Measure db filling performances (starting point)
    this._perf.db.loading.m1 = performance.now();
    // Clear any previous content
    window.localStorage.removeItem('lpsaml-session-db');
    document.getElementById('db-info').innerHTML = '';
    document.getElementById('aside-content').innerHTML = '';
    // Start the filling of the aside with current database information
    const date = new Intl.DateTimeFormat('fr', { // Format database date to FR locale
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(json.date));
    document.getElementById('feedback-label').innerHTML = `Import de la base de donnée du ${date}...`;
    document.getElementById('db-info').appendChild(this.__buildDatabaseInformation(json, date));
    // Iterate database to fill series
    for (let i = 0; i < json.data.length; ++i) {
      const element = document.createElement('P');
      element.innerHTML = `<span>
        ${json.data[i][0]} | ${json.data[i][1]} | ${json.data[i][2]}<br>
        ${json.data[i][3]}% | ${json.data[i][4]}% | ${json.data[i][5]}%<br>
        ${json.data[i][6]} – ${(json.data[i][6] === 2) ? 'Victoire Extérieure' : ((json.data[i][6] === 1) ? 'Victoire Domicile' : 'Match Nul')}
      </span>`;

      // Edit element
      const editButton = document.createElement('BUTTON');
      editButton.addEventListener('click', () => {
        this._editElementModal(i);
      });
      editButton.innerHTML = '✏️';
      element.appendChild(editButton);
      // Delete element
      const deleteButton = document.createElement('BUTTON');
      deleteButton.addEventListener('click', () => {
        this._removeDatabaseElement(i);
      });
      deleteButton.innerHTML = '🗑️';
      element.appendChild(deleteButton);

      document.getElementById('aside-content').appendChild(element);
    }
    // Save db locally and in storage
    this._db = json;
    window.localStorage.setItem('lpsaml-session-db', JSON.stringify(this._db));
    // Create scrollbar for aside's content
    this._asideScroll = new ScrollBar({
      target: document.getElementById('aside-content'),
      minSize: 200,
      style: {
        color: '#758C78'
      }
    });
    // Ensure aside's content is rendered with RAF before asking for an update
    requestAnimationFrame(this._asideScroll.updateScrollbar.bind(this._asideScroll));
    // Measure db filling performances (ending point)
    this._perf.db.loading.m2 = performance.now();
    // Notify user in UI that everything is set
    window.notification.success({
      message: `Base de donnée du ${date} chargée`,
      CBtitle: 'Voir les données',
      callback: () => this._toggleAside()
    });
    console.log(`Base de donnée du ${date} chargée en ${((this._perf.db.loading.m2 - this._perf.db.loading.m1) / 1000).toFixed(3)} seconde(s).`);
    document.getElementById('feedback-label').innerHTML = `Base de donnée du ${date} chargée en ${((this._perf.db.loading.m2 - this._perf.db.loading.m1) / 1000).toFixed(3)} seconde(s).`;
  }


  /** @method
   * @name __buildDatabaseInformation
   * @static
   * @memberof LPSAML
   * @description <blockquote>
   * Auxilliary method for <code>_fillDatabase</code> which returns a DOM object containing useful information about the database.
   * </blockquote>
   * @param {Object} db - The database as parsed JSON, must comply with a format that won't be detailled here
   * @param {String} formattedDate - A formatted date as a string
   * @returns {Object} A DOM element containing database useful information */
  __buildDatabaseInformation(db, formattedDate) {
    const container = document.createElement('P');
    container.innerHTML = `
      ${formattedDate} (version ${db.version})<br>
      ${db.data.length} entrée(s) en base
    `;
    return container;
  }


  /** @method
   * @name _requestNewElement
   * @static
   * @memberof LPSAML
   * @description <blockquote>
   * Callback method to open the new element database entry modal. It will create a default database if there isn't one already defined.
   * </blockquote> */
   _requestNewElement() {
    // If no db, create an empty one to element addition doesn't automatically fails
    if (this._db === null) {
      this._db = {
        version: '1',
        date: `${(new Date()).toISOString().split('T')[0]}`,
        data: JSON.parse('[]')
      };
    }
    // Request new element modal
    this._addElementModal();
  }


  /** @method
   * @name _editDatabaseElement
   * @static
   * @memberof LPSAML
   * @description <blockquote>
   * Method to edit an existing entry in the database. It will update the aside's once the value has been updated.
   * </blockquote>
   * @param {Number} elementIndex - The element index in dabatse array
   * @param {Object} element - The new element value */
  _editDatabaseElement(elementIndex, element) {
    this._db.data[elementIndex] = element;
    this._fillDatabase(this._db);
  }


  /** @method
   * @name _removeDatabaseElement
   * @static
   * @memberof LPSAML
   * @description <blockquote>
   * Method to remove an existing entry in the database. It will update the aside's once the value has been updated.
   * </blockquote>
   * @param {Number} elementIndex - The element index in dabatse array */
  _removeDatabaseElement(elementIndex) {
    this._db.data.splice(elementIndex, 1);
    this._fillDatabase(this._db);
  }


  /** @method
   * @name _exportDatabase
   * @static
   * @memberof LPSAML
   * @description <blockquote>
   * Method to export the loaded database as a .JSON file to the client.
   * </blockquote> */
  _exportDatabase() {
    if (this._db !== null) {
      const link = document.createElement('A');
      const data = this._db;
      data.version = `${parseInt(this._db.version) + 1}`;
      data.date = (new Date()).toISOString().split('T')[0];
      const file = new Blob([JSON.stringify(data)], { type: 'text/plain' });
      link.href = URL.createObjectURL(file);
      link.download = `lpsaml-dataset-${data.date}.json`;
      link.click();
    } else {
      document.getElementById('feedback-label').innerHTML = `Aucune base de donnée à exporter.`;
      window.notification.warning({ message: `Aucune base de donnée à exporter` });
    }
  }


  /** @method
   * @name _clearDatabase
   * @static
   * @memberof LPSAML
   * @description <blockquote>
   * Method to remove the loaded database from the client session.
   * </blockquote> */
  _clearDatabase() {
    if (this._db) {
      const date = this._db.date;
      document.getElementById('feedback-label').innerHTML = `Suppression de la base de donnée du ${date}...`;
      document.getElementById('db-info').innerHTML = `<p>Aucune information disponible, veuillez charger une base de donnée.</p>`
      document.getElementById('aside-content').innerHTML = '<i>Aucune donnée chargée en session. Veuillez glisser/déposer un fichier de base de donnée  brute (CSV) ou formattée (JSON) n\'importe où sur cette page.</i>'; // Clear previous content
      window.localStorage.removeItem('lpsaml-session-db');
      this._db = null;
      document.getElementById('feedback-label').innerHTML = `Base de donnée supprimée.`;
      window.notification.success({ message: `Base de donnée du ${date} supprimée` });
    } else {
      document.getElementById('feedback-label').innerHTML = `Aucune base de donnée à supprimer.`;
      window.notification.warning({ message: `Aucune base de donnée à supprimer` });
    }
  }


  // ----- Modal related methods


  /** @method
   * @name _addElementModal
   * @static
   * @memberof LPSA
   * @description <blockquote>
   * Displays the new element modal, and handle its event to add a new element to the database if the input is valid.
   * </blockquote> */
  _addElementModal() {
    const overlay = document.getElementById('modal-overlay');
    // Open modal event
    fetch(`assets/html/newoddelementmodal.html`).then(data => {
      overlay.style.display = 'flex';
      data.text().then(htmlString => {
        const container = document.createRange().createContextualFragment(htmlString);
        overlay.appendChild(container);

        overlay.querySelector('#submit-save').addEventListener('click', () => {
          const odds = [
            overlay.querySelector('#v1-1').value,
            overlay.querySelector('#v1-2').value,
            overlay.querySelector('#v1-3').value
          ];
          const percentage = [
            overlay.querySelector('#v2-1').value,
            overlay.querySelector('#v2-2').value,
            overlay.querySelector('#v2-3').value
          ];
          let result = overlay.querySelector('#match-result').value;

          let hasResults = true;
          for (let i = 0; i < odds.length; ++i) {
            if (!odds[i]) {
              hasResults = false;
              break;
            }
          }
          for (let i = 0; i < percentage.length; ++i) {
            if (!percentage[i]) {
              hasResults = false;
              break;
            }
          }
          if (!result) {
            hasResults = false;
          }
          // Not enough filled data
          if (!hasResults) {
            window.notification.warning({  message: `Veuillez remplir tout les champs` });
          } else if ([0, 1, 2].indexOf(parseInt(result)) === -1) {
            window.notification.warning({  message: `Le champ résultat doit avoir la valeur 0, 1 ou 2 seulement` });
          } else {
            this._db.data.push([
              parseFloat(odds[0].replace(',', '.')),
              parseFloat(odds[1].replace(',', '.')),
              parseFloat(odds[2].replace(',', '.')),
              parseFloat(percentage[0].replace(',', '.')),
              parseFloat(percentage[1].replace(',', '.')),
              parseFloat(percentage[2].replace(',', '.')),
              parseInt(result),
            ]);
            // Then update local database
            this._fillDatabase(this._db);
            this._closeModal({ srcElement: { id: 'close-button' }});
          }
        });

        setTimeout(() => overlay.style.opacity = 1, 50);
      });
    }).catch(e => console.error(e));
  }


  /** @method
   * @name _editElementModal
   * @static
   * @memberof LPSA
   * @description <blockquote>
   * Displays the edit element modal, and handle its event to edit the element in the database if the input is valid.
   * </blockquote>
   * @param {Number} elementIndex - The element associated series number */
  _editElementModal(elementIndex) {
    const overlay = document.getElementById('modal-overlay');
    // Open modal event
    fetch(`assets/html/newoddelementmodal.html`).then(data => {
      overlay.style.display = 'flex';
      data.text().then(htmlString => {
        const container = document.createRange().createContextualFragment(htmlString);
        overlay.appendChild(container);
        // Fill UI with saved value
        const element = this._db.data[elementIndex];
        overlay.querySelector('#v1-1').value = element[0];
        overlay.querySelector('#v1-2').value = element[1];
        overlay.querySelector('#v1-3').value = element[2];
        overlay.querySelector('#v2-1').value = element[3];
        overlay.querySelector('#v2-2').value = element[4];
        overlay.querySelector('#v2-3').value = element[5];
        overlay.querySelector('#match-result').value = element[6];

        overlay.querySelector('#submit-save').addEventListener('click', () => {
          const odds = [
            overlay.querySelector('#v1-1').value,
            overlay.querySelector('#v1-2').value,
            overlay.querySelector('#v1-3').value
          ];
          const percentage = [
            overlay.querySelector('#v2-1').value,
            overlay.querySelector('#v2-2').value,
            overlay.querySelector('#v2-3').value
          ];
          let result = overlay.querySelector('#match-result').value;

          let hasResults = true;
          for (let i = 0; i < odds.length; ++i) {
            if (!odds[i]) {
              hasResults = false;
              break;
            }
          }
          for (let i = 0; i < percentage.length; ++i) {
            if (!percentage[i]) {
              hasResults = false;
              break;
            }
          }
          if (!result) {
            hasResults = false;
          }
          // Not enough filled data
          if (!hasResults) {
            window.notification.warning({  message: `Veuillez remplir tout les champs` });
          } else {
            this._db.data.push([
              parseFloat(odds[0].replace(',', '.')),
              parseFloat(odds[1].replace(',', '.')),
              parseFloat(odds[2].replace(',', '.')),
              parseFloat(percentage[0].replace(',', '.')),
              parseFloat(percentage[1].replace(',', '.')),
              parseFloat(percentage[2].replace(',', '.')),
              parseFloat(result.replace(',', '.')),
            ]);
            // Then update local database
            this._fillDatabase(this._db);
            this._closeModal({ srcElement: { id: 'close-button' }});
          }
        });

        setTimeout(() => overlay.style.opacity = 1, 50);
      });
    }).catch(e => console.error(e));
  }


}


export default LPSAML;
