import LPSA from '../../src/js/LPSA.js';


let lpsa = null;


describe('LPSA unit tests :', () => {


  it('Build LPSA DOM from html template', done => {
    const rawPage = window.__html__['test/templates/index'];
    const html = document.createRange().createContextualFragment(rawPage)
    document.body.appendChild(html);
    document.body.classList.add('dnd-container');
    // Add app styles from bundle styles
    const lpsaCssBundle = document.createElement('link');
    lpsaCssBundle.rel = 'stylesheet';
    lpsaCssBundle.href = 'base/assets/dist/LPSA.bundle.css';
    document.head.appendChild(lpsaCssBundle);
    // Start testing once assets are loaded
    setTimeout(() => {
      // Test mandatory DOM elements
      expect(document.querySelector('#feedback-label')).not.toBeNull();
      expect(document.querySelector('.dnd-container')).not.toBeNull();
      expect(document.querySelector('#t1-1')).not.toBeNull();
      expect(document.querySelector('#t1-2')).not.toBeNull();
      expect(document.querySelector('#t1-3')).not.toBeNull();
      expect(document.querySelector('#t2-1')).not.toBeNull();
      expect(document.querySelector('#t2-2')).not.toBeNull();
      expect(document.querySelector('#t2-3')).not.toBeNull();
      expect(document.querySelector('#t3-1')).not.toBeNull();
      expect(document.querySelector('#t3-2')).not.toBeNull();
      expect(document.querySelector('#t3-3')).not.toBeNull();
      expect(document.querySelector('#aside-toggle')).not.toBeNull();
      expect(document.querySelector('#db-add')).not.toBeNull();
      expect(document.querySelector('#db-save')).not.toBeNull();
      expect(document.querySelector('#db-erase')).not.toBeNull();
      expect(document.querySelector('#threshold-range')).not.toBeNull();
      expect(document.querySelector('#results-range')).not.toBeNull();
      expect(document.querySelector('#precision-range')).not.toBeNull();
      expect(document.querySelector('#clear-input')).not.toBeNull();
      expect(document.querySelector('#submit-input')).not.toBeNull();
      expect(document.querySelector('#info-button')).not.toBeNull();
      expect(document.querySelector('#modal-overlay')).not.toBeNull();
      expect(document.querySelector('#loading-overlay')).not.toBeNull();
      window.localStorage.removeItem('session-db'); // Clear any previous test db
      done();
    }, 500);
  });


  it('LPSA proper construction', done => {
    lpsa = new LPSA();
    expect(JSON.stringify(lpsa)).toEqual('{"_version":"0.0.7","_input":[[0,0,0],[0,0,0],[0,0,0]],"_tensThreshold":0,"_resultsAmount":1,"_precision":75,"_asideScroll":null,"_dndController":{"_container":{},"_borderStyle":""},"_db":null,"_perf":{"db":{"m1":null,"m2":null},"analysis":{"m1":null,"m2":null}}}');
    done();
  });


  it('Fill with testing database 1', done => {
    const sampleDb = JSON.parse('{"version":1,"date":"2024-09-24","data":[{"seriesLength":4,"goFor":[],"goAgainst":[]},{"seriesLength":5,"goFor":[],"goAgainst":[]},{"seriesLength":6,"goFor":[],"goAgainst":[]},{"seriesLength":7,"goFor":[],"goAgainst":[]},{"seriesLength":8,"goFor":[],"goAgainst":[]},{"seriesLength":9,"goFor":[],"goAgainst":[]}]}');
    lpsa._fillDatabase(sampleDb);
    expect(lpsa._db).toEqual(sampleDb);
    expect(document.querySelector('#db-info').innerHTML).not.toEqual('<p>Aucune information disponible, veuillez charger une base de donnée.</p>');
    expect(document.querySelector('#aside-content').innerHTML).not.toEqual('<i>Aucune donnée chargée en session. Veuillez glisser/déposer un fichier (.JSON) de base de donnée nimporte où sur cette page.</i>');
    expect(document.querySelector('#db-info').textContent).toEqual(`
      24 septembre 2024 (version 1)
      0 entrée(s) en base
    `);
    done();
  });


  it('Append one element in database 1', done => {
    lpsa._addDatabaseElement(0, 'goFor', { values: [[1,2,3], [0,4,0], [0,0,0]], additionnal: [], comment: 'OUI' });
    expect(JSON.stringify(lpsa._db)).toEqual('{"version":1,"date":"2024-09-24","data":[{"seriesLength":4,"goFor":[{"values":[[1,2,3],[0,4,0],[0,0,0]],"additionnal":[],"comment":"OUI"}],"goAgainst":[]},{"seriesLength":5,"goFor":[],"goAgainst":[]},{"seriesLength":6,"goFor":[],"goAgainst":[]},{"seriesLength":7,"goFor":[],"goAgainst":[]},{"seriesLength":8,"goFor":[],"goAgainst":[]},{"seriesLength":9,"goFor":[],"goAgainst":[]}]}');
    done();
  });


});
