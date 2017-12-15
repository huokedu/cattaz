import React from 'react';
import PropTypes from 'prop-types';
import { diffChars } from 'diff';
import { UnControlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/mode/markdown/markdown';
import SplitPane from 'react-split-pane';

import Y from 'yjs/dist/y.es6';
import yArray from 'y-array/dist/y-array.es6';
import yWebsocketsClient from 'y-websockets-client/dist/y-websockets-client.es6';
import yMemory from 'y-memory/dist/y-memory.es6';
import yText from 'y-text/dist/y-text.es6';

import verge from 'verge';

import WikiParser from './WikiParser';

Y.extend(yArray, yWebsocketsClient, yMemory, yText);

const resizerMargin = 12;

export default class AppEnabledWikiEditorCodeMirror extends React.Component {
  constructor(props) {
    super();
    this.state = { hast: WikiParser.convertToCustomHast(WikiParser.parseToHast(props.defaultValue)), editorPercentage: 50 };
    this.handleResize = this.updateSize.bind(this);
    this.handleSplitResized = this.handleSplitResized.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
    this.handleAppEdit = this.handleAppEdit.bind(this);
  }
  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    this.updateHeight();
    this.updateWidth();
    if (this.props.roomName) {
      Y({
        db: {
          name: 'memory',
        },
        connector: {
          name: 'websockets-client',
          url: `http://${window.location.hostname}:1234`,
          // TODO: Will be solved in future https://github.com/y-js/y-websockets-server/commit/2c8588904a334631cb6f15d8434bb97064b59583#diff-e6a5b42b2f7a26c840607370aed5301a
          room: encodeURIComponent(this.props.roomName),
        },
        share: {
          textarea: 'Text',
        },
      }).then((y) => {
        this.y = y;
        y.share.textarea.bindCodeMirror(this.editor.editor);
      });
    }
  }
  componentWillReceiveProps(nextProps) {
    if (this.props.value !== nextProps.value) {
      this.editor.editor.setValue(nextProps.value);
    }
  }
  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize, false);
    if (this.y) {
      this.y.share.textarea.unbindCodeMirror(this.editor.editor);
      this.y.close();
    }
  }
  updateHeight() {
    const newHeight = verge.viewportH() - this.props.heightMargin;
    if (newHeight !== this.state.height) {
      this.setState({ height: newHeight });
      if (this.editor) {
        this.editor.editor.setSize(null, newHeight);
      }
    }
  }
  updateWidth() {
    const vw = verge.viewportW();
    let newWidth = (vw * (this.state.editorPercentage / 100)) - resizerMargin;
    if (newWidth < 0) {
      newWidth = 0;
    }
    const previewWidth = vw - newWidth - (2 * resizerMargin) - 1;
    if (newWidth !== this.state.width) {
      this.setState({ width: newWidth, previewWidth });
    }
  }
  updateSize() {
    this.updateWidth();
    this.updateHeight();
  }
  handleSplitResized(newSize) {
    const viewportWidth = verge.viewportW();
    const newPercentage = (100.0 * newSize) / viewportWidth;
    if (newPercentage !== this.state.editorPercentage) {
      this.setState({ editorPercentage: newPercentage });
      this.updateWidth();
    }
  }
  handleEdit() {
    const text = this.editor.editor.getValue();
    const hastOriginal = WikiParser.parseToHast(text);
    const hast = WikiParser.convertToCustomHast(hastOriginal);
    this.setState({ hast });
  }
  handleAppEdit(newText, appContext) {
    const cm = this.editor.editor;
    const startFencedStr = cm.getLine(appContext.position.start.line - 1);
    const [backticks] = WikiParser.getExtraFencingChars(startFencedStr, newText);
    if (backticks) {
      cm.operation(() => {
        cm.replaceRange(backticks, { line: appContext.position.start.line - 1, ch: (appContext.position.start.column - 1) });
        cm.replaceRange(backticks, { line: appContext.position.end.line - 1, ch: (appContext.position.start.column - 1) });
      });
    }
    const indentedNewText = WikiParser.indentAppCode(appContext.position, WikiParser.removeLastNewLine(newText));
    const isOldTextEmpty = appContext.position.start.line === appContext.position.end.line - 1;
    if (!isOldTextEmpty) {
      const lastLine = cm.getLine(appContext.position.end.line - 2);
      const startPos = { line: appContext.position.start.line, ch: 0 };
      const endPos = { line: appContext.position.end.line - 2, ch: lastLine.length };
      const oldText = cm.getRange(startPos, endPos);
      const changes = diffChars(oldText, indentedNewText);
      let cursor = { line: startPos.line, ch: startPos.ch };
      const nextPosition = (p, str) => {
        const lines = str.split('\n');
        if (lines.length >= 2) {
          return {
            line: p.line + (lines.length - 1),
            ch: lines[lines.length - 1].length,
          };
        }
        return {
          line: p.line,
          ch: p.ch + lines[0].length,
        };
      };
      cm.operation(() => {
        changes.forEach((c) => {
          if (c.removed) {
            const end = nextPosition(cursor, c.value);
            cm.replaceRange('', cursor, end);
          } else if (c.added) {
            cm.replaceRange(c.value, cursor);
            cursor = nextPosition(cursor, c.value);
          } else {
            cursor = nextPosition(cursor, c.value);
          }
        });
      });
    } else {
      const position = { line: appContext.position.end.line - 1, ch: 0 };
      cm.operation(() => {
        cm.replaceRange('\n', position);
        cm.replaceRange(indentedNewText, position);
      });
    }
  }
  render() {
    const cmOptions = {
      mode: 'markdown',
      lineNumbers: true,
      lineWrapping: true,
      theme: '3024-night',
    };
    return (
      <SplitPane ref={(c) => { this.spliter = c; }} split="vertical" size={this.state.width + resizerMargin} onChange={this.handleSplitResized}>
        <CodeMirror ref={(c) => { this.editor = c; }} value={this.props.defaultValue} options={cmOptions} onChange={this.handleEdit} />
        <div
          style={{
            overflow: 'auto',
            width: this.state.previewWidth,
            height: this.state.height,
            paddingLeft: resizerMargin,
          }}
          className="markdown-body"
        >
          {WikiParser.renderCustomHast(this.state.hast, { onEdit: this.handleAppEdit })}
        </div>
      </SplitPane>
    );
  }
}
AppEnabledWikiEditorCodeMirror.propTypes = {
  defaultValue: PropTypes.string,
  value: PropTypes.string,
  roomName: PropTypes.string,
  heightMargin: PropTypes.number,
};
AppEnabledWikiEditorCodeMirror.defaultProps = {
  defaultValue: '',
  value: null,
  roomName: null,
  heightMargin: 0,
};
