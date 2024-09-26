import '../scss/LPSA.scss';
import DnD from './utils/DnD';

class LPSA {


  constructor() {
    this._version = '0.0.2';
    this._mainScroll = null;
    this._asideScroll = null;
    this._dndController = null;
    // Studied values
    this._input = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    // results modificators
    this._tensThreshold = 0; // Tens tolerance threshold
    this._resultsAmount = 1; // Amount of required results
    this._precision = 75; // REesults' minimal precision
    // Class internals
    this._db = null;
    this._perf = {
      db: { m1: null, m2: null },
      analysis: { m1: null, m2: null }
    };
    // Begin website initialization
    this._initApp()
      .then(this._events.bind(this))
      .then(this._finalizeInit.bind(this))
      .catch(err => { // Error are displayed even if DEBUG is set to false, to notify end user to contact support
        console.error(`LPSA v${this._version} : Fatal error during initialization, please contact support :\n`, err);
      });
  }


  _initApp() {
    return new Promise(resolve => {
      this._dndController = new DnD({
        target: '.dnd-container',
        onDropFile: (fileInfo, data) => {
          if (fileInfo.type === 'application/json') {
            this._fillDatabase(DnD.formatAsJSON(data.target.result));
          } else {
            window.notification.error({ message: `Format de fichier non pris en charge pour l'import de la base de donnée` });
            document.getElementById('feedback-label').innerHTML = `Le fichier déposé n'est pas au format supporté (.JSON).`;
          }
        }
      });
      // Try to load DB from local storage
      const db = window.localStorage.getItem('session-db');
      if (db !== null) {
        this._fillDatabase(JSON.parse(db));
      }
      resolve();
    });
  }


  _events() {
    // Number inputs
    document.querySelector('#t1-1').addEventListener('input', this._updateInputNumber.bind(this, '1/1'));
    document.querySelector('#t1-2').addEventListener('input', this._updateInputNumber.bind(this, '1/2'));
    document.querySelector('#t1-3').addEventListener('input', this._updateInputNumber.bind(this, '1/3'));
    document.querySelector('#t2-1').addEventListener('input', this._updateInputNumber.bind(this, '2/1'));
    document.querySelector('#t2-2').addEventListener('input', this._updateInputNumber.bind(this, '2/2'));
    document.querySelector('#t2-3').addEventListener('input', this._updateInputNumber.bind(this, '2/3'));
    document.querySelector('#t3-1').addEventListener('input', this._updateInputNumber.bind(this, '3/1'));
    document.querySelector('#t3-2').addEventListener('input', this._updateInputNumber.bind(this, '3/2'));
    document.querySelector('#t3-3').addEventListener('input', this._updateInputNumber.bind(this, '3/3'));
    // Result modificators
    document.querySelector('#aside-toggle').addEventListener('click', this._toggleAside.bind(this));
    document.querySelector('#threshold-range').addEventListener('input', this._updateThresholdRange.bind(this));
    document.querySelector('#results-range').addEventListener('input', this._updateResultsRange.bind(this));
    document.querySelector('#precision-range').addEventListener('input', this._updatePrecisionRange.bind(this));
    // Submission
    document.querySelector('#clear-input').addEventListener('click', this._clearInputs.bind(this));
    document.querySelector('#submit-input').addEventListener('click', this._submitInputs.bind(this));
    // Blur modal event
    document.querySelector('#modal-overlay').addEventListener('click', this._closeModal.bind(this));
  }


  _finalizeInit() {
    return new Promise(resolve => {
      document.querySelector('#loading-overlay').style.opacity = 0;
      setTimeout(() => {
        document.querySelector('#loading-overlay').style.display = 'none';
        resolve();
      }, 400);
    });
  }


  _fillDatabase(json) {
    // Ensure the JSON data contains what we expect
    if (!json.date || !json.data) {
      window.notification.error({ message: `Le contenu de la base de donnée est mal formaté` });
      document.getElementById('feedback-label').innerHTML = `Le fichier déposé ne contiens pas les données attentudes.`;
      return;
    }
    // Clear any pevious saved db
    window.localStorage.removeItem('session-db');
    // Starting db creation
    const date = new Intl.DateTimeFormat('fr', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(json.date));
    document.getElementById('feedback-label').innerHTML = `Import de la base de donnée du ${date}...`;
    document.getElementById('aside-content').innerHTML = ''; // Clear previous content
    this._perf.db.m1 = performance.now();
    for (let i = 0; i < json.data.length; ++i) {
      const series = document.createElement('DIV');
      series.classList.add('series');
      series.innerHTML = `
        <h2>Série ${json.data[i].seriesLength}/9</h2>
        <h3>Parier <span class="go-for">Pour</span> :</h3>
      `;
      for (let j = 0; j < json.data[i].goFor.length; ++j) {
        series.appendChild(this._buildElement(json.data[i].goFor[j]));
      }
      series.innerHTML += `<h3>Parier <span class="go-against">Contre</span></h3>`;
      for (let j = 0; j < json.data[i].goAgainst.length; ++j) {
        series.appendChild(this._buildElement(json.data[i].goAgainst[j]));
      }
      document.getElementById('aside-content').appendChild(series);
    }
    // Save db locally and in storage
    this._db = json;
    window.localStorage.setItem('session-db', JSON.stringify(this._db));

    this._asideScroll = new window.ScrollBar({
      target: document.getElementById('aside-content'),
      minSize: 200,
      style: {
        color: '#758C78'
      }
    });
    requestAnimationFrame(() => {
      this._asideScroll.updateScrollbar();
    });
    this._perf.db.m2 = performance.now();
    window.notification.success({ 
      message: `Base de donnée du ${date} chargée`,
      CBtitle: 'Voir les données',
      callback: () => this._toggleAside()
    });
    document.getElementById('feedback-label').innerHTML = `Base de donnée du ${date} chargée en ${((this._perf.db.m2 - this._perf.db.m1) / 1000).toFixed(3)} seconde(s).`;
  }


  // 


  _buildElement(data) {
    const element = document.createElement('P');
    const v = data.values;
    element.innerHTML = `
      <span class="value">${v[0][0]}, ${v[0][1]}, ${v[0][2]} / ${v[1][0]}, ${v[1][1]}, ${v[1][2]} / ${v[2][0]}, ${v[2][1]}, ${v[2][2]}</span>
    `;
    if (data.additionnal.length > 0) {
      const a = data.additionnal;
      element.innerHTML += `
        <span class="additionnal">${a[0][0]}-${a[0][1]}-${a[0][2]} / ${a[1][0]}-${a[1][1]}-${a[1][2]} / ${a[2][0]}-${a[2][1]}-${a[2][2]}</span>
      `;
    }
    if (data.comment !== '') {
      element.innerHTML += `
        <span class="comment">${data.comment}</span>
      `;
    }
    return element;
  };


  _updateInputNumber(inputString, e) {
    // First ensure input value is properly splitted
    const whichInput = inputString.split('/');
    if (whichInput.length !== 2) {
      e.returnValue = false;
      return;
    }
    // Ensure provided input is only numerical
    const numericalRegex = /[0-9]|\./;
    if (!numericalRegex.test(e.target.value)) {
      e.target.classList.add('error');
      setTimeout(() => e.target.classList.remove('error'), 1500);
      e.target.value = null;
      this._input[whichInput[0] - 1][whichInput[1] - 1] = 0; // reset input value
      return;
    }

    e.target.classList.add('success');
    setTimeout(() => e.target.classList.remove('success'), 1500);
    this._input[whichInput[0] - 1][whichInput[1] - 1] = parseInt(e.target.value);
  }


  _updateThresholdRange(e) {
    const value = e.target.value;
    this._tensThreshold = parseInt(value); // Save value as integer
    document.querySelector('#threshold-range-label').innerHTML = `Tolérance ${value}`;
  }


  _updateResultsRange(e) {
    const value = e.target.value;
    this._resultsAmount = parseInt(value); // Save value as integer
    document.querySelector('#results-range-label').innerHTML = `Nombre de resultats ${value}`;
  }


  _updatePrecisionRange(e) {
    const value = e.target.value;
    this._precision = parseInt(value); // Save value as integer
    document.querySelector('#precision-range-label').innerHTML = `Précision minimale : ${value}%`;
  }


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
    this._seriesAnalysis(isFilled);
  }


  _seriesAnalysis(length) {
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
    // Internal method to iterates db and compare against input
    const computeCandidates = targetArray => {
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
    };
    // Perform analysis
    let goForCandidates = computeCandidates(targetData.goFor);
    let goAgainstCandidates = computeCandidates(targetData.goAgainst);
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


  // Aside viewer


  _toggleAside() {
    if (document.getElementById('bd-viewer').classList.contains('opened')) {
      document.getElementById('aside-toggle').innerHTML = '>';
      document.getElementById('bd-viewer').classList.remove('opened');
    } else {
      document.getElementById('aside-toggle').innerHTML = '<';
      document.getElementById('bd-viewer').classList.add('opened');
    }
  }


  // Modal related methods


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
            const goForElement = this._buildElement(goForCandidates[i].series);
            const goForItem = document.createElement('DIV');
            goForItem.classList.add('category-item');
            goForItem.innerHTML = `
              <h4>${100 - goForCandidates[i].distance}%</h4>
            `;
            goForItem.appendChild(goForElement);
            container.querySelector('#go-for').appendChild(goForItem);
          }
          // Same goes for goAgainst candidates
          if (goAgainstCandidates[i]) {
            const goAgainstElement = this._buildElement(goAgainstCandidates[i].series);
            const goAgainstItem = document.createElement('DIV');
            goAgainstItem.classList.add('category-item');
            goAgainstItem.innerHTML = `
              <h4>${100 - goAgainstCandidates[i].distance}%</h4>
            `;
            goAgainstItem.appendChild(goAgainstElement);
            container.querySelector('#go-against').appendChild(goAgainstItem);
          }
        }

        const scroll = new window.ScrollBar({
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

        container.querySelector('#close-button').addEventListener('click', this._closeModal.bind(this));
        overlay.appendChild(container);
        setTimeout(() => overlay.style.opacity = 1, 50);
      });
    }).catch(e => console.error(e));
  }


  _infoModal() {
    const overlay = document.getElementById('modal-overlay');
    // Open modal event
    fetch(`assets/html/infomodal.html`).then(data => {
      overlay.style.display = 'flex';
      data.text().then(htmlString => {
        const container = document.createRange().createContextualFragment(htmlString);
        overlay.appendChild(container);
        setTimeout(() => overlay.style.opacity = 1, 50);
      });
    }).catch(e => console.error(e));
  }


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


export default LPSA;
