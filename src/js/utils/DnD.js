class DnD {


  /** @summary <h1>A DnD simple implementation to convert any DOM element into a drop content handler</h1>
   * @author Arthur Beaulieu
   * @since March 2019
   * @description <blockquote>This class aims to propose a drag and drop abstraction, so you can focus on the dropped content handling only.
   * Instantiate this with a DOM target, and a file handler callback in which you might do your treatments with the dropped file(s).</blockquote>
   * @param {Object} options - The DnD class arguments object
   * @param {String} options.target - The DnD target DOM element query selector
   * @param {Function} options.onDropFile - The callback to call when a file is handled */
  constructor(options) {
    try {
      /** @private
       * @member {Object} - The DnD container DOM node */
      this._container = document.querySelector(options.target); // Get given target from the DOM
      /** @private
       * @member {Function} - The file handler callback */
      this._onDropFileCB = options.onDropFile; // Assign the onDropFile callback to an internal
      /** @private
       * @member {String} - The target default border rule (to properly restor border on leave/end) */
      this._borderStyle = this._container.style.border; // Back target border style to restore it on leave/drop events
      this._events(); // Attach all drag events
    } catch(error) { // Mostly handle the case in which the target selector given as an argument is wrong
      console.error(`Unable to build the DnD class.\n${error}`);
    }
  }


  /** @method
   * @name formatAsJSON
   * @static
   * @memberof DnD
   * @description <blockquote>Convert a raw dropped content into a JSON object</blockquote> */
  static formatAsJSON(raw) {
    return JSON.parse(raw);
  }


  /** @method
   * @name formatCSVAsJSON
   * @static
   * @memberof DnD
   * @description <blockquote>Convert a raw dropped CSV content into a JSON object, with floating values</blockquote> */
  static formatCSVAsJSON(str, delimiter) {
    // MVP Trevor Dixon (<3) in https://stackoverflow.com/questions/1293147/how-to-parse-csv-data
    // Updated to match our need
    const arr = [];
    // Iterate over each character, keep track of current row and column (of the returned array)
    for (let row = 0, col = 0, c = 0; c < str.length; ++c) {
      let cc = str[c], nc = str[c + 1]; // Current character, next character
      arr[row] = arr[row] || []; // Create a new row if necessary
      arr[row][col] = arr[row][col] || ''; // Create a new column (start with empty string) if necessary
      // If it's a comma and we're not in a quoted field, move on to the next column
      if (cc === delimiter) {
        // Parsefloat saved output
        arr[row][col] = parseFloat(arr[row][col]);
        ++col;
        continue;
      }
      // If it's a newline (CRLF) and we're not in a quoted field, skip the next character
      // and move on to the next row and move to column 0 of that new row
      if (cc === '\r' && nc === '\n') {
        arr[row][col] = parseFloat(arr[row][col]);
        ++row;
        col = 0;
        ++c;
        continue;
      }
      // If it's a newline (LF or CR) and we're not in a quoted field,
      // move on to the next row and move to column 0 of that new row
      if (cc === '\n') {
        ++row;
        col = 0;
        continue;
      }
      if (cc === '\r') {
        ++row;
        col = 0;
        continue;
      }
      // Otherwise, append the current character to the current column
      arr[row][col] += cc;
    }

    return arr;   
  }


  /** @method
   * @name _events
   * @private
   * @memberof DnD
   * @description <blockquote>Attach to the container all the needed drag/drop events</blockquote> */
  _events() {
    this._container.addEventListener('dragenter', this._dragEnter.bind(this), false);
    this._container.addEventListener('dragover', this._dragOver.bind(this), false);
    this._container.addEventListener('dragleave', this._dragLeave.bind(this), false);
    this._container.addEventListener('drop', this._drop.bind(this), false);
  }


  /** @method
   * @name _eventBehavior
   * @private
   * @memberof DnD
   * @description <blockquote>Stops the given event propagation and default behavior</blockquote>
   * @param {Event} event - The event to change behavior from */
  _eventBehavior(event) {
    event.stopPropagation();
    event.preventDefault();
  }


  /** @method
   * @name _dragEnter
   * @private
   * @memberof DnD
   * @description <blockquote>User entered the target div with a dragged content under mouse</blockquote>
   * @param {Event} event - The event to handle */
  _dragEnter(event) {
    this._eventBehavior(event);
    this._container.style.border = 'dashed 6px rgb(255, 100, 100)';
  }


  /** @method
   * @name _dragOver
   * @private
   * @memberof DnD
   * @description <blockquote>User hovers the target div with a dragged content under mouse</blockquote>
   * @param {Event} event - The event to handle */
  _dragOver(event) {
    this._eventBehavior(event);
    event.dataTransfer.dropEffect = 'copy';
  }


  /** @method
   * @name _dragLeave
   * @private
   * @memberof DnD
   * @description <blockquote>User left the target div with a dragged content under mouse</blockquote>
   * @param {Event} event - The event to handle */
  _dragLeave(event) {
    if (event.relatedTarget === null) {
      this._eventBehavior(event);
      this._container.style.border = this._borderStyle;
    }
  }


  /** @method
   * @name _drop
   * @private
   * @memberof DnD
   * @description <blockquote>User dropped content on the target div</blockquote>
   * @param {Event} event - The event to handle */
  _drop(event) {
    this._eventBehavior(event);
    this._container.style.border = this._borderStyle;

    const files = event.dataTransfer.files;
    for (let i = 0; i < files.length; ++i) {
      const reader = new FileReader();
      reader.onload = (theFile => {
        return raw => {
          this._onDropFileCB(theFile, raw);
        };
      })(files[i]);
      reader.readAsText(files[i]);
    }
  }
}


export default DnD;
