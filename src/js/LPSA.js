import '../scss/LPSA.scss';
import DnD from './utils/DnD';

class LPSA {


  constructor() {
    this._version = '0.0.1';
    this._mainScroll = null;
    this._asideScroll = null;
    this._dndController = null;
    // Class internals
    this._input = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    this._tensThreshold = 0; // Tens tolerance threshold
    this._resultsAmount = 1; // Amount of required results
    this._db = null;
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
    // Modificators and submission
    document.querySelector('#aside-toggle').addEventListener('click', this._toggleAside.bind(this));
    document.querySelector('#threshold-range').addEventListener('input', this._updateThresholdRange.bind(this));
    document.querySelector('#results-range').addEventListener('input', this._updateResultsRange.bind(this));
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
/*
        this._mainScroll = new window.ScrollBar({
          target: document.body,
          minSize: 200,
          style: {
            color: '#758C78'
          }
        });
*/
        // Force raf after scroll creation to make scrollbar properly visible
        requestAnimationFrame(() => {
          //this._mainScroll.updateScrollbar();
          resolve();
        });
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

    window.notification.success({ 
      message: `Base de donnée du ${date} chargée`,
      CBtitle: 'Voir les données',
      callback: () => this._toggleAside()
    });
    document.getElementById('feedback-label').innerHTML = `Base de donnée du ${date} chargée.`;
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
      return;
    }

    e.target.classList.add('success');
    setTimeout(() => e.target.classList.remove('success'), 1500);
    this._input[whichInput[0] - 1][whichInput[1] - 1] = parseInt(e.target.value);
  }


  _updateThresholdRange(e) {
    const value = e.target.value;
    this._threshold = parseInt(value); // Save value as integer
    document.querySelector('#threshold-range-label').innerHTML = `Tolérance ${value}`;
  }


  _updateResultsRange(e) {
    const value = e.target.value;
    this._resultsAmount = parseInt(value); // Save value as integer
    document.querySelector('#results-range-label').innerHTML = `Nombre de resultats ${value}`;
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
    // Starting analysis
    this._seriesAnalysis(isFilled);
  }


  _seriesAnalysis(length) {
    document.getElementById('feedback-label').innerHTML = `Démarrage de l'analyse, serie évaluée ${length}/9...`;
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
    // First parse goFor values to check best matches
    let goForCandidates = []; // In this aray, we store the distance value with input. The lower the best
    for (let i = 0; i < targetData.goFor.length; ++i) {
      // Perform iteration on the 3 triplets
      let distance = 0;
      for (let j = 0; j < 3; ++j) {
        for (let k = 0; k < 3; ++k) {
          // First implem is to get absolute value of substraction, to compute distance
          // On second phase, we will only compare numbers in the same tens
          // ez way is const tens = Math.pow( 10, Math.floor( Math.log(n) / Math.log(10) ) );
          distance += Math.abs(targetData.goFor[i].values[j][k] - this._input[j][k]);
        }
      }
      // Push result to array, index will match goFor length
      goForCandidates.push({
        distance: distance,
        series: targetData.goFor[i]
      });
    }
    // Then parse goAgainst values for matches
    let goAgainstCandidates = []; // In this aray, we store the distance value with input. The lower the best
    for (let i = 0; i < targetData.goAgainst.length; ++i) {
      // Perform iteration on the 3 triplets
      let distance = 0;
      for (let j = 0; j < 3; ++j) {
        for (let k = 0; k < 3; ++k) {
          // First implem is to get absolute value of substraction, to compute distance
          // On second phase, we will only compare numbers in the same tens
          // ez way is const tens = Math.pow( 10, Math.floor( Math.log(n) / Math.log(10) ) );
          distance += Math.abs(targetData.goAgainst[i].values[j][k] - this._input[j][k]);
        }
      }
      // Push result to array, index will match goFor length
      goAgainstCandidates.push({
        distance: distance,
        series: targetData.goAgainst[i]
      });
    }
    // Perform sorting on values
    goForCandidates = goForCandidates.sort((a, b) => { return a.distance - b.distance; });
    goAgainstCandidates = goAgainstCandidates.sort((a, b) => { return a.distance - b.distance; });
    // Update GUI with best candidates
    for (let i = 0; i < this._resultsAmount; ++i) {
      const goForElement = this._buildElement(goForCandidates[i].series);
      const goForItem = document.createElement('DIV');
      goForItem.classList.add('category-item');
      goForItem.innerHTML = `
        <h4>${goForCandidates[i].distance}</h4>
      `;
      goForItem.appendChild(goForElement);
      document.getElementById('go-for').appendChild(goForItem);
      const goAgainstElement = this._buildElement(goAgainstCandidates[i].series);
      const goAgainstItem = document.createElement('DIV');
      goAgainstItem.classList.add('category-item');
      goAgainstItem.innerHTML = `
        <h4>${goAgainstCandidates[i].distance}</h4>
      `;
      goAgainstItem.appendChild(goAgainstElement);
      document.getElementById('go-against').appendChild(goAgainstItem);
    }

    console.log(goForCandidates);
    console.log(goAgainstCandidates);
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
    if (e.srcElement.id !== 'modal-overlay' && e.srcElement.className !== 'close-modal') {
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
