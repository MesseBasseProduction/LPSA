import LPSA from '../../src/js/LPSA.js';


describe('LPSA unit tests :', () => {


  it('Build LPSA DOM from html template', done => {
    const rawPage = window.__html__['test/templates/index'];
    const html = document.createRange().createContextualFragment(rawPage)
    document.body.appendChild(html);
    document.body.classList.add('dnd-container');
    // Add custom styles
    const notifBundle = document.createElement('link');
    notifBundle.rel = 'stylesheet';
    notifBundle.href = 'base/assets/lib/Notification.bundle.css';
    document.head.appendChild(notifBundle);
    const scrollBundle = document.createElement('link');
    scrollBundle.rel = 'stylesheet';
    scrollBundle.href = 'base/assets/lib/ScrollBar.bundle.css';
    document.head.appendChild(scrollBundle);
    done();
  });


  
  it('Create baseline components', done => {
    window.notification = new window.Notification();
    window.LPSA = new LPSA();
    done();
  });


});
