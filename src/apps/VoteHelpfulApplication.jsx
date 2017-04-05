import React from 'react';

class VoteModel {
  constructor() {
    this.candidates = {
      Yes: 0,
      No: 0,
    };
  }
  addVote(name) {
    this.candidates[name] = this.candidates[name] + 1;
  }
  serialize() {
    return JSON.stringify(this, null, 2);
  }
  static deserialize(str) {
    try {
      const obj = JSON.parse(str);
      const model = new VoteModel();
      model.candidates = obj.candidates;
      return model;
    } catch (ex) {
      return new VoteModel();
    }
  }
}

export default class VoteApplication extends React.Component {
  constructor(props) {
    super();
    this.handleAddVote = this.handleAddVote.bind(this);
    this.state = { vote: VoteModel.deserialize(props.data), voted: false };
  }
  componentWillReceiveProps(newProps) {
    const vote = VoteModel.deserialize(newProps.data);
    this.setState({ vote });
  }
  shouldComponentUpdate(/* newProps, nextState */) {
    // TODO
    return true;
  }
  handleAddVote(event) {
    const value = event.target.getAttribute('data-index');
    this.state.vote.addVote(value);
    this.props.onEdit(this.state.vote.serialize(), this.props.appContext);
    this.setState({ voted: true });
  }
  render() {
    const colors = { No: '#da3d3d', Yes: '#218bce' };
    const styles = {
      button: {
        margin: '10px',
        fontSize: 'x-large',
        backgroundColor: 'white',
        borderWidth: '5px',
        borderStyle: 'solid',
        width: '200px',
        height: '150px',
        borderRadius: '10px',
      },
      bar: {
        float: 'left',
        textAlign: 'center',
        color: 'white',
        height: '20px',
      },
      message: {
        backgroundColor: '#eee',
      },
    };

    const buttonElems = ['Yes', 'No'].map(key =>
      <input
        type="button"
        style={Object.assign(
          {},
          styles.button,
          { borderColor: colors[key] },
        )}
        data-index={key}
        onClick={this.handleAddVote}
        value={key}
      />,
    );

    /* eslint-disable camelcase, dot-notation, no-mixed-operators */
    const W = 350;
    const n_y = this.state.vote.candidates['Yes'];
    const n_n = this.state.vote.candidates['No'];
    const w_y = n_y / (n_y + n_n);
    const w_n = n_n / (n_y + n_n);

    const barElems = (<div style={{ marginTop: '10px' }}>
      <div style={{ float: 'left' }}>{Math.round(w_y * 100)}%</div>
      <div style={Object.assign({}, styles.bar, { backgroundColor: colors.Yes, width: n_y / (n_y + n_n) * W })}>{n_y}</div>
      <div style={Object.assign({}, styles.bar, { backgroundColor: colors.No, width: n_n / (n_y + n_n) * W })}>{n_n}</div>
      <div>{Math.round(w_n * 100)}%</div>
    </div>);
    /* eslint-enable */

    return (<div>
      {
        this.state.voted
          ? <p style={styles.message}>Thank you for contribution!</p>
          : buttonElems
      }
      {
        this.state.vote.candidates.Yes + this.state.vote.candidates.No > 0
          ? barElems
          : null
      }
    </div>);
  }
}

VoteApplication.propTypes = {
  data: React.PropTypes.string.isRequired,
  onEdit: React.PropTypes.func.isRequired,
  appContext: React.PropTypes.shape({}).isRequired,
};
