import '../scss/LPSA.scss';
import AbstractLPSA from './utils/AbstractLPSA';
import DnD from './utils/DnD';
import ScrollBar from './utils/ScrollBar';


class LPSA extends AbstractLPSA {


  /** @summary <h1>The global LPSA application class, which handles both UI, modelisation and computing.</h1>
   * @author Arthur Beaulieu
   * @since September 2024
   * @description <blockquote>
   * Providing the whole UI structure and events, so user can interact and performs the following :
   * <ul>
   *   <li>manage session database (load database, add entry, edit entry, delete entry, export databse, clear database) ;</li>
   *   <li>provide input values to compare against the loaded database (additionnal controls over results amounts, precision threshold and tolerance threshold) ;</li>
   *   <li>matching results displayed in order with confidence index.</li>
   * </ul>
   * For confidentiality purpose, no other spec will be defined.
   * </blockquote> */
  constructor() {
    super();

    // ----- Studied values
    /** @private
     * @member {Array<Array<Number>>} - The sutied user input to compare against loaded database */
    this._input = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

    // ----- Results modificators
    /** @private
     * @member {Number} - The threshold to compare values in different tens */
    this._tensThreshold = 0; // Tens tolerance threshold
    /** @private
     * @member {Number} - The amount of wanted results when comparing inputs to the loaded database */
    this._resultsAmount = 1; // Amount of required results
    /** @private
     * @member {Number} - The minimal esults confidence required to display results */
    this._precision = 75; // Results' minimal precision

    // ----- App performances
    /** @private
     * @member {Object} - Holds the performance timing measures */
    this._perf = {
      db: { m1: null, m2: null },
      analysis: { m1: null, m2: null }
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
   * @memberof LPSA
   * @description <blockquote>
   * Initializes the drag and drop controller over the <main> DOM element, and tries to load a database stored in the local storage.
   * If any databse is stored, it will be loaded in session and the aside will be filled with its data.
   * </blockquote>
   * @returns {Promise} Promise that is resolved if DnD controller is properly initialized, rejected otherwise */
  _initApp() {
    return new Promise((resolve, reject) => {
      try {
        this._dndController = new DnD({
          target: '.dnd-container',
          onDropFile: (fileInfo, data) => {
            if (fileInfo.type === 'application/json') {
              // If dropped file is a .JSON file, proceed to fill database
              this._fillDatabase(DnD.formatAsJSON(data.target.result));
            } else {
              // Notify user that dropped file isn't expected
              window.notification.error({ message: `Format de fichier non pris en charge pour l'import de la base de donnée` });
              document.getElementById('feedback-label').innerHTML = `Le fichier déposé n'est pas au format supporté (.JSON).`;
            }
          }
        });
        // Try to load DB from local storage if any
        const db = window.localStorage.getItem('lpsa-session-db');
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
   * @memberof LPSA
   * @description <blockquote>
   * Allow every user interaction by listening to DOM events on specific UI elements.
   * </blockquote>
   * @returns {Promise} Promise that is resolved if all events are listened, rejected otherwise */
  _events() {
    return new Promise((resolve, reject) => {
      try {
        // Number inputs
        document.querySelector('#t1-1').addEventListener('input', this._updateInputNumber.bind(this, '0/0'));
        document.querySelector('#t1-2').addEventListener('input', this._updateInputNumber.bind(this, '0/1'));
        document.querySelector('#t1-3').addEventListener('input', this._updateInputNumber.bind(this, '0/2'));
        document.querySelector('#t2-1').addEventListener('input', this._updateInputNumber.bind(this, '1/0'));
        document.querySelector('#t2-2').addEventListener('input', this._updateInputNumber.bind(this, '1/1'));
        document.querySelector('#t2-3').addEventListener('input', this._updateInputNumber.bind(this, '1/2'));
        document.querySelector('#t3-1').addEventListener('input', this._updateInputNumber.bind(this, '2/0'));
        document.querySelector('#t3-2').addEventListener('input', this._updateInputNumber.bind(this, '2/1'));
        document.querySelector('#t3-3').addEventListener('input', this._updateInputNumber.bind(this, '2/2'));
        // Result modificators
        document.querySelector('#threshold-range').addEventListener('input', this._updateThresholdRange.bind(this));
        document.querySelector('#results-range').addEventListener('input', this._updateResultsRange.bind(this));
        document.querySelector('#precision-range').addEventListener('input', this._updatePrecisionRange.bind(this));
        // Submission
        document.querySelector('#clear-input').addEventListener('click', this._clearInputs.bind(this));
        document.querySelector('#submit-input').addEventListener('click', this._submitInputs.bind(this));
        // Call for parent class _events
        super._events();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }


  // ----- Input event callbacks



  /** @method
   * @name _updateInputNumber
   * @static
   * @memberof LPSA
   * @description <blockquote>
   * Callback method to update a given input either visually and in internal value.
   * </blockquote>
   * @param {String} inputString - The input position formatted x/y, x being the triplet number and y being the inpus position in triplet
   * @param {Event} e - The associated input event */
  _updateInputNumber(inputString, e) {
    // First ensure inputString value is properly formatted
    const whichInput = inputString.split('/');
    if (whichInput.length !== 2) {
      return;
    }
    // Now ensure inputString doesn't overflow [0,2]
    if (whichInput[0] > 2 || whichInput[4] > 2 ) {
      return;
    }
    // Ensure provided input is only numerical
    const numericalRegex = /[0-9]|\./;
    if (!numericalRegex.test(e.target.value)) {
      e.target.classList.add('error');
      setTimeout(() => e.target.classList.remove('error'), 1500);
      e.target.value = null;
      this._input[whichInput[0]][whichInput[1]] = 0; // Reset input value to avoid hybrid input state
      return;
    }
    // Update the input field and store new value in internal input value
    e.target.classList.add('success');
    setTimeout(() => e.target.classList.remove('success'), 1500);
    this._input[whichInput[0]][whichInput[1]] = parseInt(e.target.value);
  }


  /** @method
   * @name _updateThresholdRange
   * @static
   * @memberof LPSA
   * @description <blockquote>
   * Callback method to update the tens tolerance for analysis results.
   * </blockquote>
   * @param {Event} e - The associated input event */
  _updateThresholdRange(e) {
    const value = e.target.value;
    this._tensThreshold = parseInt(value); // Save value as integer
    document.querySelector('#threshold-range-label').innerHTML = `Tolérance ${value}`;
  }


  /** @method
   * @name _updateResultsRange
   * @static
   * @memberof LPSA
   * @description <blockquote>
   * Callback method to update the amount of wanted results.
   * </blockquote>
   * @param {Event} e - The associated input event */
  _updateResultsRange(e) {
    const value = e.target.value;
    this._resultsAmount = parseInt(value); // Save value as integer
    document.querySelector('#results-range-label').innerHTML = `Nombre de resultats ${value}`;
  }


  /** @method
   * @name _updatePrecisionRange
   * @static
   * @memberof LPSA
   * @description <blockquote>
   * Callback method to update the minimal required precision for results.
   * </blockquote>
   * @param {Event} e - The associated input event */
  _updatePrecisionRange(e) {
    const value = e.target.value;
    this._precision = parseInt(value); // Save value as integer
    document.querySelector('#precision-range-label').innerHTML = `Précision minimale : ${value}%`;
  }


  /** @method
   * @name _clearInputs
   * @static
   * @memberof LPSA
   * @description <blockquote>
   * Callback method to clear all inputs content.
   * </blockquote>
   * @param {Event} e - The associated click event */
  _clearInputs(e) {
    // Clear inputs
    document.querySelector('#t1-1').value = null;
    document.querySelector('#t1-2').value = null;
    document.querySelector('#t1-3').value = null;
    document.querySelector('#t2-1').value = null;
    document.querySelector('#t2-2').value = null;
    document.querySelector('#t2-3').value = null;
    document.querySelector('#t3-1').value = null;
    document.querySelector('#t3-2').value = null;
    document.querySelector('#t3-3').value = null;
    // Clear internal data
    this._input = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    // Blur button
    e.target.blur();
    window.notification.info({ message: `Les champs en entrée ont été nettoyés` });
  }


  /** @method
   * @name _submitInputs
   * @static
   * @memberof LPSA
   * @description <blockquote>
   * Callback method to submit given inputs for analysis.
   * </blockquote>
   * @param {Event} e - The associated click event */
  _submitInputs(e) {
    // Ensure a db has been dropped first
    if (this._db === null) {
      window.notification.warning({ message: `Aucune base de donnée n'est chargée en mémoire` });
      document.getElementById('feedback-label').innerHTML = `Veuillez d'abord glisser-déposer n'importe ou sur la page le JSON de données.`;
      e.target.blur();
      return;
    }
    // Then ensure that there are more than 4 inputs filled
    let isFilled = 0;
    for (let i = 0; i < this._input.length; ++i) {
      for (let j = 0; j < this._input[i].length; ++j) {
        if (this._input[i][j] > 0) {
          ++isFilled;
        }
      }
    }
    // Not enough filled data
    if (isFilled < 4) {
      window.notification.warning({ message: `L'indice de valeur de cette serie est inférieur a 4/9` });
      document.getElementById('feedback-label').innerHTML = `Cette serie comporte moins de 4/9 valeurs et n'est pas pertinente à analyser.`;
      e.target.blur();
      return;
    }
    // Start analysis
    this._performInputAnalysis(isFilled);
  }


  // ----- Local database handler (all allowed data manipulation)


  /** @method
   * @name _fillDatabase
   * @static
   * @memberof LPSA
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
    this._perf.db.m1 = performance.now();
    // Clear any previous content
    window.localStorage.removeItem('lpsa-session-db');
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
      const goFor = this.__buildDatabaseSeries(json.data[i], 'goFor', i);
      document.getElementById('aside-content').appendChild(goFor);
      const goAgainst = this.__buildDatabaseSeries(json.data[i], 'goAgainst', i);
      document.getElementById('aside-content').appendChild(goAgainst);
    }
    // Save db locally and in storage
    this._db = json;
    window.localStorage.setItem('lpsa-session-db', JSON.stringify(this._db));
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
    this._perf.db.m2 = performance.now();
    // Notify user in UI that everything is set
    window.notification.success({
      message: `Base de donnée du ${date} chargée`,
      CBtitle: 'Voir les données',
      callback: () => this._toggleAside()
    });
    document.getElementById('feedback-label').innerHTML = `Base de donnée du ${date} chargée en ${((this._perf.db.m2 - this._perf.db.m1) / 1000).toFixed(3)} seconde(s).`;
  }


  /** @method
   * @name __buildDatabaseInformation
   * @static
   * @memberof LPSA
   * @description <blockquote>
   * Auxilliary method for <code>_fillDatabase</code> which returns a DOM object containing useful information about the database.
   * </blockquote>
   * @param {Object} db - The database as parsed JSON, must comply with a format that won't be detailled here
   * @param {String} formattedDate - A formatted date as a string
   * @returns {Object} A DOM element containing database useful information */
  __buildDatabaseInformation(db, formattedDate) {
    let nbElem = 0;
    for (let i = 0; i < db.data.length; ++i) {
      nbElem += db.data[i].goFor.length;
      nbElem += db.data[i].goAgainst.length;
    }
    const container = document.createElement('P');
    container.innerHTML = `
      ${formattedDate} (version ${db.version})<br>
      ${nbElem} entrée(s) en base
    `;
    return container;
  }


  /** @method
   * @name __buildDatabaseSeries
   * @static
   * @memberof LPSA
   * @description <blockquote>
   * Auxilliary method for <code>_fillDatabase</code> which returns a DOM object containing all information of a given data series.
   * </blockquote>
   * @param {Object} data - The database as parsed JSON, must comply with a format that won't be detailled here
   * @param {String} type - Either 'goFor' or 'goAgainst' to specify which series is built here
   * @param {String} i - The series' index, mostly used for edit/remove entry callback
   * @returns {Object} A DOM element containing the stutied series */
  __buildDatabaseSeries(data, type, i) {
    // Create series title
    const series = document.createElement('DIV');
    series.classList.add('series');
    series.innerHTML = `
      <h2>Série ${data.seriesLength}/9, parier <span class="go-${type.substring(2).toLowerCase()}">${type === 'goFor' ? 'Pour' : 'Contre'}</span><br><i>${data[type].length} entrée(s)</i></h2>
    `;
    // Create expander/collapser for studied series
    const expandCollapse = document.createElement('DIV');
    expandCollapse.innerHTML = '➖'; //➕
    series.firstElementChild.appendChild(expandCollapse);
    // Create container and iterate series entries to fill container with
    const seriesContainer = document.createElement('DIV');
    // Only iterate entries if any, display no results otherwise
    if (data[type].length) {
      for (let j = 0; j < data[type].length; ++j) {
        // Build databse element
        const element = this._buildDatabaseElement(data[type][j]);
        // Edit element
        const editButton = document.createElement('BUTTON');
        editButton.addEventListener('click', () => {
          this._editElementModal(i, j, type);
        });
        editButton.innerHTML = '✏️';
        element.appendChild(editButton);
        // Delete element
        const deleteButton = document.createElement('BUTTON');
        deleteButton.addEventListener('click', () => {
          this._removeDatabaseElement(i, j, type);
        });
        deleteButton.innerHTML = '🗑️';
        element.appendChild(deleteButton);
        // Append element to series container
        seriesContainer.appendChild(element);
      }
    } else {
      // No results in series
      const element = document.createElement('P');
      element.innerHTML = 'Aucune entrée pour cette catégorie';
      seriesContainer.appendChild(element);
    }
    // Expand/collapse event
    expandCollapse.addEventListener('click', () => {
      if (expandCollapse.innerHTML === '➖') {
        expandCollapse.innerHTML = '➕';
        seriesContainer.style.display = 'none';
      } else {
        expandCollapse.innerHTML = '➖';
        seriesContainer.style.display = 'inherit';
      }
      // Update scroll to ensure its re-computed with new height
      requestAnimationFrame(this._asideScroll.updateScrollbar.bind(this._asideScroll));
    });
    // Final DOM chaining before returning element
    series.appendChild(seriesContainer);
    return series;
  }


  /** @method
   * @name _buildDatabaseElement
   * @static
   * @memberof LPSA
   * @description <blockquote>
   * Generic method which returns a DOM object containing a database element.
   * </blockquote>
   * @param {Object} data - A databse entry, containing values, additionnal values and a comment
   * @returns {Object} A DOM element containing the databse entry */
  _buildDatabaseElement(data) {
    const element = document.createElement('P');
    const v = data.values;
    element.innerHTML = `
      <span class="value">${v[0][0]}, ${v[0][1]}, ${v[0][2]} / ${v[1][0]}, ${v[1][1]}, ${v[1][2]} / ${v[2][0]}, ${v[2][1]}, ${v[2][2]}</span>
    `;
    // Additionnal content
    if (data.additionnal.length > 0) {
      const a = data.additionnal;
      element.innerHTML += `
        <span class="additionnal">${a[0][0]}-${a[0][1]}-${a[0][2]} / ${a[1][0]}-${a[1][1]}-${a[1][2]} / ${a[2][0]}-${a[2][1]}-${a[2][2]}</span>
      `;
    } else {
      element.innerHTML += `
        <span class="additionnal">-</span>
      `;
    }
    // Comment section
    if (data.comment !== '') {
      element.innerHTML += `
        <span class="comment">${data.comment}</span>
      `;
    } else {
      element.innerHTML += `
        <span class="comment">-</span>
      `;
    }
    return element;
  }


  /** @method
   * @name _addDatabaseElement
   * @static
   * @memberof LPSA
   * @description <blockquote>
   * Append a given entry into the session database.
   * </blockquote>
   * @param {Number} index - The series index in database
   * @param {String} type - The element type in goFor' or 'goAgainst'
   * @param {Object} element - The to add in database */
  _addDatabaseElement(index, type, element) {
    this._db.data[index][type].push(element);
  }


  /** @method
   * @name _requestNewElement
   * @static
   * @memberof LPSA
   * @description <blockquote>
   * Callback method to open the new element database entry modal. It will create a default database if there isn't one already defined.
   * </blockquote> */
   _requestNewElement() {
    // If no db, create an empty one to element addition doesn't automatically fails
    if (this._db === null) {
      this._db = {
        version: '1',
        date: `${(new Date()).toISOString().split('T')[0]}`,
        data: JSON.parse('[{"seriesLength":4,"goFor":[],"goAgainst":[]},{"seriesLength":5,"goFor":[],"goAgainst":[]},{"seriesLength":6,"goFor":[],"goAgainst":[]},{"seriesLength":7,"goFor":[],"goAgainst":[]},{"seriesLength":8,"goFor":[],"goAgainst":[]},{"seriesLength":9,"goFor":[],"goAgainst":[]}]')
      };
    }
    // Request new element modal
    this._addElementModal();
  }


  /** @method
   * @name _editDatabaseElement
   * @static
   * @memberof LPSA
   * @description <blockquote>
   * Method to edit an existing entry in the database. It will update the aside's once the value has been updated.
   * </blockquote>
   * @param {Number} seriesNumber - The element associated series number
   * @param {Number} elementNumber - The element associated number in the series
   * @param {String} type - The element type ; either goFor' or 'goAgainst'
   * @param {Object} element - The new element value (containing value, additionnal and comment keys) */
  _editDatabaseElement(seriesNumber, elementNumber, type, element) {
    this._db.data[seriesNumber][type][elementNumber] = element;
    this._fillDatabase(this._db);
  }


  /** @method
   * @name _removeDatabaseElement
   * @static
   * @memberof LPSA
   * @description <blockquote>
   * Method to remove an existing entry in the database. It will update the aside's once the value has been updated.
   * </blockquote>
   * @param {Number} seriesNumber - The element associated series number
   * @param {Number} elementNumber - The element associated number in the series
   * @param {String} type - The element type ; either goFor' or 'goAgainst' */
  _removeDatabaseElement(seriesNumber, elementNumber, type) {
    this._db.data[seriesNumber][type].splice(elementNumber, 1);
    this._fillDatabase(this._db);
  }


  /** @method
   * @name _exportDatabase
   * @static
   * @memberof LPSA
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
      link.download = `lpsa-dataset-${data.date}.json`;
      link.click();
    } else {
      document.getElementById('feedback-label').innerHTML = `Aucune base de donnée à exporter.`;
      window.notification.warning({ message: `Aucune base de donnée à exporter` });
    }
  }


  /** @method
   * @name _clearDatabase
   * @static
   * @memberof LPSA
   * @description <blockquote>
   * Method to remove the loaded database from the client session.
   * </blockquote> */
  _clearDatabase() {
    if (this._db) {
      const date = this._db.date;
      document.getElementById('feedback-label').innerHTML = `Suppression de la base de donnée du ${date}...`;
      document.getElementById('db-info').innerHTML = `<p>Aucune information disponible, veuillez charger une base de donnée.</p>`
      document.getElementById('aside-content').innerHTML = '<i>Aucune donnée chargée en session. Veuillez glisser/déposer un fichier (.JSON) de base de donnée n\'importe où sur cette page.</i>'; // Clear previous content
      window.localStorage.removeItem('lpsa-session-db');
      this._db = null;
      document.getElementById('feedback-label').innerHTML = `Base de donnée supprimée.`;
      window.notification.success({ message: `Base de donnée du ${date} supprimée` });
    } else {
      document.getElementById('feedback-label').innerHTML = `Aucune base de donnée à supprimer.`;
      window.notification.warning({ message: `Aucune base de donnée à supprimer` });
    }
  }


  /** @method
   * @name _performInputAnalysis
   * @static
   * @memberof LPSA
   * @description <blockquote>
   * After a valid input submitted, perform an analysis of input values against the session database, to retrieve matching results.
   * </blockquote>
   * @param {Number} length - The target series length to compare input with */
  _performInputAnalysis(length) {
    document.getElementById('feedback-label').innerHTML = `Démarrage de l'analyse, serie évaluée ${length}/9...`;
    this._perf.analysis.m1 = performance.now();
    // Select matching input from given length
    let targetData = null;
    for (let i = 0; i < this._db.data.length; ++i) {
      if (this._db.data[i].seriesLength === length) {
        targetData = this._db.data[i];
        break;
      }
    }
    // No matching length in db
    if (targetData === null) {
      window.notification.error({ message: `Aucune donnée ${length}/9 à comparer` });
      document.getElementById('feedback-label').innerHTML = `Aucune donnée en base pour des séries evalués ${length}/9.`;
      return;
    }
    // Perform analysis
    let goForCandidates = this.__computeCandidates(targetData.goFor);
    let goAgainstCandidates = this.__computeCandidates(targetData.goAgainst);
    // Perform sorting on result values by distance
    goForCandidates = goForCandidates.sort((a, b) => { return a.distance - b.distance; });
    goAgainstCandidates = goAgainstCandidates.sort((a, b) => { return a.distance - b.distance; });
    this._resultsModal(goForCandidates, goAgainstCandidates);
    // Search completed
    this._perf.analysis.m2 = performance.now();
    window.notification.success({
      message: `Analyse des données terminée`
    });
    document.getElementById('feedback-label').innerHTML = `Analyse de la serie terminée :  ${goForCandidates.length + goAgainstCandidates.length} résultat(s).`;
  }


  /** @method
   * @name __computeCandidates
   * @static
   * @memberof LPSA
   * @description <blockquote>
   * Auxilliary method for <code>_performInputAnalysis</code> which computes the candidates for a given input according to user's criterias set through range sliders.
   * </blockquote>
   * @param {Array<Object>} targetArray - The target array to compare input with.
   * @returns {Array<Object>} An array containing all candidates database entries which met the filtering criterias */
  __computeCandidates(targetArray) {
    let outputCandidates = []; // In this aray, we store the distance value with input. The lower the best
    for (let i = 0; i < targetArray.length; ++i) {
      // Perform iteration on the 3 triplets
      let distance = 0;
      let usableCandidate = true; // Is the studied candidate worth adding to results
      for (let j = 0; j < 3; ++j) {
        for (let k = 0; k < 3; ++k) {
          // We aim to compute a distance between target input and studied series.
          // The distance is a substraction (in abs value) of those value
          // If values are from a different tens, we ignore the comparison*
          //* Depending on the tolerance threshold, we can compare number of different tens according to thresh value
          const studiedTens = parseInt(`${targetArray[i].values[j][k] / 10}`[0]);
          const inputTens = parseInt(`${this._input[j][k] / 10}`[0]);
          // Don't compare valid input with db value at 0
          if (this._input[j][k] !== 0 && targetArray[i].values[j][k] === 0) {
            // Candidate is not relevant as a result -> do not compare input value facing a 0
            usableCandidate = false;
          } else {
            if (studiedTens === inputTens) {
              // First use case, tens are the same, compute distance
              distance += Math.abs(targetArray[i].values[j][k] - this._input[j][k]);
            } else if (Math.abs(targetArray[i].values[j][k] - this._input[j][k]) <= this._tensThreshold) {
              // Otherwise, the absolute substraction is under or equal to tolerance threshold
              distance += Math.abs(targetArray[i].values[j][k] - this._input[j][k]);
            } else {
              // Candidate is not relevant as a result (not same tens and beyond tolerance)
              usableCandidate = false;
            }
          }
        }
      }
      // Push result to array only if valid, and over required precision
      if (usableCandidate === true && distance < 100 && (100 - distance) >= this._precision) {
        outputCandidates.push({
          distance: distance,
          series: targetArray[i]
        });
      }
    }

    return outputCandidates;
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
    fetch(`assets/html/newelementmodal.html`).then(data => {
      overlay.style.display = 'flex';
      data.text().then(htmlString => {
        const container = document.createRange().createContextualFragment(htmlString);
        overlay.appendChild(container);

        overlay.querySelector('#submit-save').addEventListener('click', () => {
          const input = [
            [parseInt(overlay.querySelector('#v1-1').value) || 0, parseInt(overlay.querySelector('#v1-2').value) || 0, parseInt(overlay.querySelector('#v1-3').value) || 0],
            [parseInt(overlay.querySelector('#v2-1').value) || 0, parseInt(overlay.querySelector('#v2-2').value) || 0, parseInt(overlay.querySelector('#v2-3').value) || 0],
            [parseInt(overlay.querySelector('#v3-1').value) || 0, parseInt(overlay.querySelector('#v3-2').value) || 0, parseInt(overlay.querySelector('#v3-3').value) || 0],
          ];
          // Then ensure that there are more than 4 inputs filled
          let isFilled = 0;
          for (let i = 0; i < input.length; ++i) {
            for (let j = 0; j < input[i].length; ++j) {
              if (input[i][j] > 0) {
                ++isFilled;
              }
            }
          }
          // Not enough filled data
          if (isFilled < 4) {
            window.notification.warning({  message: `L'indice de valeur de cette serie est inférieur a 4/9` });
          } else {
            const outputElement = {
              values: input,
              additionnal: [],
              comment: overlay.querySelector('#comment').value
            }
            // Add additionnal values only if one of them is not null
            let hasAdditionnal = false;
            for (let i = 0; i < 3; ++i) {
              for (let j = 0; j < 3; ++j) {
                if (!isNaN(parseInt(overlay.querySelector(`#a${i}-${j}`).value))) {
                  hasAdditionnal = true;
                  break;
                }
              }
              if (hasAdditionnal) {
                break;
              }
            }
            if (hasAdditionnal === true) {
              outputElement.additionnal = [
                [parseInt(overlay.querySelector('#a1-1').value) || 0, parseInt(overlay.querySelector('#a1-2').value) || 0, parseInt(overlay.querySelector('#a1-3').value) || 0],
                [parseInt(overlay.querySelector('#a2-1').value) || 0, parseInt(overlay.querySelector('#a2-2').value) || 0, parseInt(overlay.querySelector('#a2-3').value) || 0],
                [parseInt(overlay.querySelector('#a3-1').value) || 0, parseInt(overlay.querySelector('#a3-2').value) || 0, parseInt(overlay.querySelector('#a3-3').value) || 0],
              ];
            }
            // Iterate DB to append new element in proper section
            for (let i = 0; i < this._db.data.length; ++i) {
              if (this._db.data[i].seriesLength === isFilled) {
                if (overlay.querySelector('#switch').checked) {
                  this._addDatabaseElement(i, 'goAgainst', outputElement);
                } else {
                  this._addDatabaseElement(i, 'goFor', outputElement);
                }
              }
            }
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
   * @param {Number} seriesNumber - The element associated series number
   * @param {Number} elementNumber - The element associated number in the series
   * @param {String} type - The element type ; either goFor' or 'goAgainst' */
  _editElementModal(seriesNumber, elementNumber, type) {
    const overlay = document.getElementById('modal-overlay');
    // Open modal event
    fetch(`assets/html/newelementmodal.html`).then(data => {
      overlay.style.display = 'flex';
      data.text().then(htmlString => {
        const container = document.createRange().createContextualFragment(htmlString);
        overlay.appendChild(container);
        // Fill UI with saved value
        const element = this._db.data[seriesNumber][type][elementNumber];

        overlay.querySelector('#switch').checked = (type === 'goFor') ? false : true;
        overlay.querySelector('#v1-1').value = element.values[0][0] || '';
        overlay.querySelector('#v1-2').value = element.values[0][1] || '';
        overlay.querySelector('#v1-3').value = element.values[0][2] || '';
        overlay.querySelector('#v2-1').value = element.values[1][0] || '';
        overlay.querySelector('#v2-2').value = element.values[1][1] || '';
        overlay.querySelector('#v2-3').value = element.values[1][2] || '';
        overlay.querySelector('#v3-1').value = element.values[2][0] || '';
        overlay.querySelector('#v3-2').value = element.values[2][1] || '';
        overlay.querySelector('#v3-3').value = element.values[2][2] || '';
        // Only fill additionnal if any saved
        if (element.additionnal.length === 3) {
          overlay.querySelector('#a1-1').value = element.additionnal[0][0];
          overlay.querySelector('#a1-2').value = element.additionnal[0][1];
          overlay.querySelector('#a1-3').value = element.additionnal[0][2];
          overlay.querySelector('#a2-1').value = element.additionnal[1][0];
          overlay.querySelector('#a2-2').value = element.additionnal[1][1];
          overlay.querySelector('#a2-3').value = element.additionnal[1][2];
          overlay.querySelector('#a3-1').value = element.additionnal[2][0];
          overlay.querySelector('#a3-2').value = element.additionnal[2][1];
          overlay.querySelector('#a3-3').value = element.additionnal[2][2];
        }
        // Only update comment if any existing
        if (element.comment !== '') {
          overlay.querySelector('#comment').value = element.comment;
        }
        // Submit event listener
        overlay.querySelector('#submit-save').addEventListener('click', () => {
          const input = [
            [parseInt(overlay.querySelector('#v1-1').value) || 0, parseInt(overlay.querySelector('#v1-2').value) || 0, parseInt(overlay.querySelector('#v1-3').value) || 0],
            [parseInt(overlay.querySelector('#v2-1').value) || 0, parseInt(overlay.querySelector('#v2-2').value) || 0, parseInt(overlay.querySelector('#v2-3').value) || 0],
            [parseInt(overlay.querySelector('#v3-1').value) || 0, parseInt(overlay.querySelector('#v3-2').value) || 0, parseInt(overlay.querySelector('#v3-3').value) || 0],
          ];
          // Then ensure that there are more than 4 inputs filled
          let isFilled = 0;
          for (let i = 0; i < input.length; ++i) {
            for (let j = 0; j < input[i].length; ++j) {
              if (input[i][j] > 0) {
                ++isFilled;
              }
            }
          }
          // Not enough filled data
          if (isFilled < 4) {
            window.notification.warning({  message: `L'indice de valeur de cette serie est inférieur a 4/9` });
          } else {
            const outputElement = {
              values: input,
              additionnal: [],
              comment: overlay.querySelector('#comment').value
            }
            // Add additionnal values only if not null
            if (!isNaN(parseInt(overlay.querySelector('#a1-1').value))) {
              outputElement.additionnal = [
                [parseInt(overlay.querySelector('#a1-1').value) || 0, parseInt(overlay.querySelector('#a1-2').value) || 0, parseInt(overlay.querySelector('#a1-3').value) || 0],
                [parseInt(overlay.querySelector('#a2-1').value) || 0, parseInt(overlay.querySelector('#a2-2').value) || 0, parseInt(overlay.querySelector('#a2-3').value) || 0],
                [parseInt(overlay.querySelector('#a3-1').value) || 0, parseInt(overlay.querySelector('#a3-2').value) || 0, parseInt(overlay.querySelector('#a3-3').value) || 0],
              ];
            }
            // Ensure the element has changed seriesType (ie was goFor, became goAgainst)
            if (
              (type === 'goFor' && overlay.querySelector('#switch').checked === true) ||
              (type === 'goAgainst' && overlay.querySelector('#switch').checked === false) ||
              (seriesNumber !== isFilled)
            ) {
              // Remove from existing series type
              this._removeDatabaseElement(seriesNumber, elementNumber, type);
              // Now push in new seriesy type
              for (let i = 0; i < this._db.data.length; ++i) {
                if (this._db.data[i].seriesLength === isFilled) {
                  if (overlay.querySelector('#switch').checked) {
                    this._db.data[i].goAgainst.push(outputElement);
                  } else {
                    this._db.data[i].goFor.push(outputElement);
                  }
                }
              }
              // Manually update db
              this._fillDatabase(this._db);
            } else {
              // Edit db element (will reload db itself) and close modal
              this._editDatabaseElement(seriesNumber, elementNumber, type, outputElement);
            }
            this._closeModal({ srcElement: { id: 'close-button' }});
          }
        });

        setTimeout(() => overlay.style.opacity = 1, 50);
      });
    }).catch(e => console.error(e));
  }


  /** @method
   * @name _resultsModal
   * @static
   * @memberof LPSA
   * @description <blockquote>
   * Displays the results modal with all provided candidates, sorted by confidence and for each types
   * </blockquote>
   * @param {Array<Object>} goForCandidates - The candidates elements for 'goFor' type
   * @param {Array<Object>} goAgainstCandidates - The candidates elements for 'goAgainst' type */
  _resultsModal(goForCandidates, goAgainstCandidates) {
    const overlay = document.getElementById('modal-overlay');
    // Open modal event
    fetch(`assets/html/resultsmodal.html`).then(data => {
      overlay.style.display = 'flex';
      data.text().then(htmlString => {
        const container = document.createRange().createContextualFragment(htmlString);
        // Update modal summary info
        const v = this._input;
        container.querySelector('#studied-series').innerHTML = `
          ${v[0][0]}, ${v[0][1]}, ${v[0][2]} / ${v[1][0]}, ${v[1][1]}, ${v[1][2]} / ${v[2][0]}, ${v[2][1]}, ${v[2][2]}
        `;
        container.querySelector('#study-stats').innerHTML = `
          Un total de ${goForCandidates.length + goAgainstCandidates.length} résultat(s) ont été trouvés dans la base de donnée.<br>
          Ces résultats ont été trouvés en ${((this._perf.db.m2 - this._perf.db.m1) / 1000).toFixed(3)} seconde(s).<br><br>
          Le nombre de résultats à afficher par catégorie est de <b>${this._resultsAmount}</b>.<br>
          La tolérance pour les calculs entre dizaines est de <b>${this._tensThreshold}</b>.<br>
          La précision minimale pour ces résultats est de <b>${this._precision}%</b>.
        `;
        // Update GUI with best candidates
        for (let i = 0; i < this._resultsAmount; ++i) {
          // Only add goFor candidate if exists in results
          if (goForCandidates[i]) {
            const goForElement = this._buildDatabaseElement(goForCandidates[i].series);
            const goForItem = document.createElement('DIV');
            goForItem.classList.add('category-item');
            goForItem.innerHTML = `
              <h4>${100 - goForCandidates[i].distance}%</h4>
            `;
            goForItem.appendChild(goForElement);
            container.querySelector('#go-for').appendChild(goForItem);
          } else if (container.querySelector('#go-for').innerHTML === '') {
            const element = document.createElement('P');
            element.innerHTML = '<b>Aucun résultats pour cette catégorie</b>';
            container.querySelector('#go-for').appendChild(element);
          }
          // Same goes for goAgainst candidates
          if (goAgainstCandidates[i]) {
            const goAgainstElement = this._buildDatabaseElement(goAgainstCandidates[i].series);
            const goAgainstItem = document.createElement('DIV');
            goAgainstItem.classList.add('category-item');
            goAgainstItem.innerHTML = `
              <h4>${100 - goAgainstCandidates[i].distance}%</h4>
            `;
            goAgainstItem.appendChild(goAgainstElement);
            container.querySelector('#go-against').appendChild(goAgainstItem);
          } else if (container.querySelector('#go-against').innerHTML === '') {
            const element = document.createElement('P');
            element.innerHTML = '<b>Aucun résultats pour cette catégorie</b>';
            container.querySelector('#go-against').appendChild(element);
          }
        }

        const scroll = new ScrollBar({
          target: container.querySelector('.results-wrapper'),
          minSize: 200,
          style: {
            color: '#758C78'
          }
        });

        // Force raf after scroll creation to make scrollbar properly visible
        requestAnimationFrame(() => {
          scroll.updateScrollbar();
        });

        overlay.appendChild(container);
        setTimeout(() => overlay.style.opacity = 1, 50);
      });
    }).catch(e => console.error(e));
  }


}


export default LPSA;
