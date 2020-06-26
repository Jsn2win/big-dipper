import qs from 'querystring';
import Cosmos from "@lunie/cosmos-js"
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import {
    Button, Spinner, TabContent, TabPane, Row, Col, Modal, ModalHeader,
    Form, ModalBody, ModalFooter, InputGroup, InputGroupAddon, Input, Progress,
    UncontrolledTooltip, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, Table, Label, FormGroup, FormText, FormFeedback, InputGroupText
} from 'reactstrap';
import { Ledger, DEFAULT_MEMO } from './ledger.js';
import { Validators } from '/imports/api/validators/validators.js';
import AccountTooltip from '/imports/ui/components/AccountTooltip.jsx';
import Coin from '/both/utils/coins.js';
import numbro from 'numbro';
import TimeStamp from '../components/TimeStamp.jsx';
import moment from 'moment';
import Account from '../components/Account.jsx';
import _ from 'lodash';
import i18n from 'meteor/universe:i18n';

const maxHeightModifier = {
    setMaxHeight: {
        enabled: true,
        fn: (data) => {
            return { ...data, styles: { ...data.styles, 'overflowY': 'auto', maxHeight: '80vh' } };
        }
    }
}

const T = i18n.createComponent();

const Types = {
    DELEGATE: 'delegate',
    REDELEGATE: 'redelegate',
    UNDELEGATE: 'undelegate',
    WITHDRAW: 'withdraw',
    SEND: 'send',
    SUBMITPROPOSAL: 'submitProposal',
    VOTE: 'vote',
    DEPOSIT: 'deposit',
    CLAIMSWAP: 'claim',
    CREATECDP: 'createCDP',
    DEPOSITCDP: 'depositCDP',
    WITHDRAWCDP: 'withdrawCDP',
    DRAWDEBT: 'drawDebtCDP',
    REPAYDEBT: 'repayDebtCDP',
    CLAIMINCENTIVEREWARDS: 'claimIncentiveRewards',
    AUCTIONBID: 'auctionBid'
}

const DEFAULT_GAS_ADJUSTMENT = '1.4';



const TypeMeta = {
    [Types.DELEGATE]: {
        button: 'delegate',
        pathPreFix: 'staking/delegators',
        pathSuffix: 'delegations',
        warning: ''
    },
    [Types.REDELEGATE]: {
        button: 'redelegate',
        pathPreFix: 'staking/delegators',
        pathSuffix: 'redelegations',
        warning: (duration, maxEntries) => {
            let dayTime = duration / 1000000;
            let unbondingPeriod = moment.duration(dayTime);

            return `You are only able to redelegate from Validator A to Validator B
                  up to ${maxEntries} times in a ${unbondingPeriod.humanize()} period.
                  Also, There is ${unbondingPeriod.humanize()} cooldown from serial redelegation;
                  Once you redelegate from Validator A to Validator B,
                  you will not be able to redelegate from Validator B to another
                  validator for the next ${unbondingPeriod.humanize()}.`
        }
    },
    [Types.UNDELEGATE]: {
        button: 'undelegate',
        pathPreFix: 'staking/delegators',
        pathSuffix: 'unbonding_delegations',
        warning: (duration) => {
            let dayTime = duration / 1000000;
            let unbondingPeriod = moment.duration(dayTime)
            return `There is a ${unbondingPeriod.humanize()}-day unbonding period.`
        }
    },
    [Types.WITHDRAW]: {
        button: 'withdraw',
        pathPreFix: 'distribution/delegators',
        pathSuffix: 'rewards',
        warning: '',
        gasAdjustment: '1.6'
    },
    [Types.SEND]: {
        button: 'transfer',
        button_other: 'send',
        pathPreFix: 'bank/accounts',
        pathSuffix: 'transfers',
        warning: '',
        gasAdjustment: '1.8'
    },
    [Types.SUBMITPROPOSAL]: {
        button: 'new',
        path: 'gov/proposals',
        gasAdjustment: '1.4'
    },
    [Types.VOTE]: {
        button: 'vote',
        pathPreFix: 'gov/proposals',
        pathSuffix: 'votes',
        gasAdjustment: '2.5'
    },
    [Types.DEPOSIT]: {
        button: 'deposit',
        pathPreFix: 'gov/proposals',
        pathSuffix: 'deposits',
        gasAdjustment: '2'
    },
    [Types.CLAIMSWAP]: {
        button: 'claim swap',
        pathPreFix: 'bep3/swap/claim',
        pathSuffix: ' ',
        gasAdjustment: '1.6'
    },
    [Types.CREATECDP]: {
        button: 'create CDP',
        pathPreFix: 'cdp',
        pathSuffix: ' ',
        gasAdjustment: '1.6'
    },
    [Types.DEPOSITCDP]: {
        button: 'deposit CDP',
        pathPreFix: 'cdp',
        pathSuffix: 'deposits',
        gasAdjustment: '1.6'
    },
    [Types.WITHDRAWCDP]: {
        button: 'withdraw',
        pathPreFix: 'cdp',
        pathSuffix: 'withdraw',
        gasAdjustment: '1.6'
    },
    [Types.DRAWDEBT]: {
        button: 'draw debt',
        pathPreFix: 'cdp',
        pathSuffix: 'draw',
        gasAdjustment: '1.6'
    },
    [Types.REPAYDEBT]: {
        button: 'repay debt',
        pathPreFix: 'cdp',
        pathSuffix: 'repay',
        gasAdjustment: '1.6'
    },
    [Types.CLAIMINCENTIVEREWARDS]: {
        button: 'claim rewards',
        pathPreFix: 'incentive',
        pathSuffix: 'claim',
        gasAdjustment: '1.6'
    },
    [Types.AUCTIONBID]: {
        button: 'Place a Bid',
        pathPreFix: 'auctions',
        pathSuffix: 'bids',
        gasAdjustment: '1.6'
    }


}

const CoinAmount = (props) => {
    let coin = {};
    if (!props.coin && !props.amount) return null;
    if (!props.denom) {
        coin = new Coin(props.amount).toString(4);
    }
    else {
        let denomFinder = Meteor.settings.public.coins.find(({ denom }) => denom === props.denom);
        let displayDenom = denomFinder ? denomFinder.displayName : null;

        let finder = props.amount.find(({ denom }) => denom === props.denom)
        coin = finder ? new Coin(finder.amount, finder.denom).toString(4) : '0.0000 ' + displayDenom;
    }
    let denom = (props.mint) ? Coin.StakingCoin.denom : Coin.StakingCoin.displayName;

    return <span><span className={props.className || 'coin'}>{coin}</span> </span>
}


const Amount = (props) => {
    if (!props.coin && !props.amount) return null;
    let coin = props.coin || new Coin(props.amount, props.denom).toString(4);
    let amount = (props.mint) ? Math.round(coin.amount) : coin.stakingAmount;
    let denom = (props.mint) ? Coin.StakingCoin.denom : Coin.StakingCoin.displayName;
    return <span><span className={props.className || 'amount'}>{numbro(amount).format("0,0.0000")}</span> <span className='denom'>{denom}</span></span>
}



const Fee = (props) => {
    return <span><CoinAmount mint className='gas' amount={props.gas * Meteor.settings.public.gasPrice} /> as fee </span>
}

const isActiveValidator = (validator) => {
    return !validator.jailed && validator.status == 2;
}

const isBetween = (value, min, max) => {
    if (value instanceof Coin) value = value.amount;
    if (min instanceof Coin) min = min.amount;
    if (max instanceof Coin) max = max.amount;
    return value >= min && value <= max;
}

const startsWith = (str, prefix) => {
    return str.substr(0, prefix.length) === prefix
}

const isAddress = (address) => {
    return address && startsWith(address, Meteor.settings.public.bech32PrefixAccAddr)
}

const isValidatorAddress = (address) => {
    return address && startsWith(address, Meteor.settings.public.bech32PrefixValAddr)
}

class LedgerButton extends Component {
    constructor(props) {
        super(props);
        this.state = {
            activeTab: '2',
            errorMessage: '',
            user: localStorage.getItem(CURRENTUSERADDR),
            pubKey: localStorage.getItem(CURRENTUSERPUBKEY),
            memo: DEFAULT_MEMO
        };
        this.ledger = new Ledger({ testModeAllowed: false });
    }

    close = () => {
        this.setState({
            activeTab: '2',
            errorMessage: '',
            isOpen: false,
            actionType: undefined,
            loading: undefined,
            loadingBalance: undefined,
            currentUser: undefined,
            delegateAmount: undefined,
            transferTarget: undefined,
            transferAmount: undefined,
            success: undefined,
            targetValidator: undefined,
            simulating: undefined,
            gasEstimate: undefined,
            txMsg: undefined,
            params: undefined,
            proposalTitle: undefined,
            proposalDescription: undefined,
            depositAmount: undefined,
            voteOption: undefined,
            memo: DEFAULT_MEMO,
            swapID: undefined,
            swapRandomNumber: undefined,
            modal: false,
            ratio: 0,
            collateral: 0,
            debt: 0,
            collateralAmount: 0,
            debtAmount: 0,



        });
    }
    static getDerivedStateFromProps(props, state) {
        if (state.user !== localStorage.getItem(CURRENTUSERADDR)) {
            return {
                user: localStorage.getItem(CURRENTUSERADDR),
                pubKey: localStorage.getItem(CURRENTUSERPUBKEY)
            };
        }
        return null;
    }

    initStateOnLoad = (action, state) => {
        this.setState({
            loading: true,
            [action]: true,
            ...state,
        })
    }

    setStateOnSuccess = (action, state) => {
        this.setState({
            loading: false,
            [action]: false,
            errorMessage: '',
            ...state,
        });
    }

    setStateOnError = (action, errorMsg, state = {}) => {
        this.setState({
            loading: false,
            [action]: false,
            errorMessage: errorMsg,
            ...state,
        });
    }

    componentDidUpdate(prevProps, prevState) {

        this.autoOpenModal();
        if ((this.state.isOpen && !prevState.isOpen) || (this.state.user && this.state.user != prevState.user)) {
            if (!this.state.success)
                this.tryConnect();
            this.getBalance();
        }
    }

    componentDidMount() {
        this.autoOpenModal()
    }

    autoOpenModal = () => {
        let query = this.props.history && this.props.history.location.search.substr(1)
        if (query && !this.state.isOpen) {
            let params = qs.parse(query)
            if (params.signin == undefined && params.action && this.supportAction(params.action)) {
                this.props.history.push(this.props.history.location.pathname)
                this.openModal(params.action, this.filterParams(params))
            }
        }
    }

    supportAction() {
        return false
    }

    filterParams() {
        return {}
    }

    getBalance = () => {
        if (this.state.loadingBalance) return

        this.initStateOnLoad('loadingBalance', {
            loading: this.state.actionType === Types.DELEGATE || this.state.actionType === Types.WITHDRAW,
            loadingRedelegations: this.state.actionType === Types.REDELEGATE
        });

        if (this.state.actionType === Types.REDELEGATE) {
            Meteor.call('accounts.getAllRedelegations', this.state.user, this.props.validator.operator_address, (error, result) => {
                try {
                    if (result)
                        this.setStateOnSuccess('loadingRedelegations', { redelegations: result })
                    if (!result || error) {
                        this.setStateOnError('loadingRedelegations')
                    }
                } catch (e) {
                    this.setStateOnError('loadingRedelegations', e.message);
                }
            })
        }

        Meteor.call('accounts.getAccountDetail', this.state.user, (error, result) => {
            try {
                if (result) {
                    let coin;
                    coin = result.coins[0] ? (new Coin(result.coins[0].amount, result.coins[0].denom)) : (new Coin(0));

                    this.setStateOnSuccess('loadingBalance', {
                        currentUser: {
                            accountNumber: result.account_number,
                            sequence: result.sequence || 0,
                            availableCoin: coin
                        }
                    })
                }
                if (!result || error) {
                    this.setStateOnError(
                        'loadingBalance',
                        `Failed to get account info for ${this.state.user}`,
                        { activeTab: '0' }
                    )
                }
            } catch (e) {
                this.setStateOnError('loadingBalance', e.message);
            }
        })
    }

    tryConnect = () => {
        this.ledger.getCosmosAddress().then((res) => {
            if (res.address == this.state.user)
                this.setState({
                    success: true,
                    activeTab: this.state.activeTab === '1' ? '2' : this.state.activeTab
                })
            else {
                if (this.state.isOpen) {
                    this.setState({
                        success: false,
                        activeTab: '0',
                        errorMessage: `Currently logged in as another user ${this.state.user}`
                    })
                }
            }
        }, (err) => this.setState({
            success: false,
            activeTab: '1'
        }));
    }

    getTxContext = () => {
        return {
            chainId: Meteor.settings.public.chainId,
            bech32: this.state.user,
            accountNumber: this.state.currentUser.accountNumber,
            sequence: this.state.currentUser.sequence,
            denom: Coin.StakingCoin.denom,
            pk: this.state.pubKey,
            path: [44, 118, 0, 0, 0],
            memo: this.state.memo
        }
    }

    createMessage = (callback) => {
        let txMsg
        switch (this.state.actionType) {
            case Types.DELEGATE:
                txMsg = Ledger.createDelegate(
                    this.getTxContext(),
                    this.props.validator.operator_address,
                    this.state.delegateAmount.amount)
                break;
            case Types.REDELEGATE:
                txMsg = Ledger.createRedelegate(
                    this.getTxContext(),
                    this.props.validator.operator_address,
                    this.state.targetValidator.operator_address,
                    this.state.delegateAmount.amount)
                break;
            case Types.UNDELEGATE:
                txMsg = Ledger.createUndelegate(
                    this.getTxContext(),
                    this.props.validator.operator_address,
                    this.state.delegateAmount.amount);
                break;
            case Types.SEND:
                txMsg = Ledger.createTransfer(
                    this.getTxContext(),
                    this.state.transferTarget,
                    this.state.transferAmount.amount);
                break;
            case Types.SUBMITPROPOSAL:
                txMsg = Ledger.createSubmitProposal(
                    this.getTxContext(),
                    this.state.proposalTitle,
                    this.state.proposalDescription,
                    this.state.depositAmount.amount);
                break;
            case Types.VOTE:
                txMsg = Ledger.createVote(
                    this.getTxContext(),
                    this.props.proposalId,
                    this.state.voteOption);
                break;
            case Types.DEPOSIT:
                txMsg = Ledger.createDeposit(
                    this.getTxContext(),
                    this.props.proposalId,
                    this.state.depositAmount.amount);
                break;
            case Types.CLAIMSWAP:
                txMsg = Ledger.claimSwap(
                    this.getTxContext(),
                    this.state.swapID,
                    this.state.swapRandomNumber);
                break;
            case Types.CREATECDP:
                txMsg = Ledger.createCDP(
                    this.getTxContext(),
                    this.state.collateral,
                    this.state.debt);
                break;
            case Types.DEPOSITCDP:
                txMsg = Ledger.depositCDP(
                    this.getTxContext(),
                    this.state.collateral,
                    this.state.collateralDenom,
                    this.state.cdpOwner);
                break;
            case Types.WITHDRAWCDP:
                txMsg = Ledger.withdrawCDP(
                    this.getTxContext(),
                    this.state.collateral,
                    this.state.collateralDenom,
                    this.state.cdpOwner);
                break;
            case Types.DRAWDEBT:
                txMsg = Ledger.drawDebt(
                    this.getTxContext(),
                    this.state.draw,
                    this.state.collateralDenom);
                break;
            case Types.REPAYDEBT:
                txMsg = Ledger.repayDebt(
                    this.getTxContext(),
                    this.state.debt,
                    this.state.collateralDenom);
                break;
            case Types.CLAIMINCENTIVEREWARDS:
                txMsg = Ledger.claimIncentiveRewards(
                    this.getTxContext(),
                    this.state.denom);
                break;
            case Types.AUCTIONBID:
                txMsg = Ledger.auctionBid(
                    this.getTxContext(),
                    this.state.auctionID,
                    this.state.bid);
                break;

        }

        callback(txMsg, this.getSimulateBody(txMsg))
    }

    getSimulateBody(txMsg) {
        return (txMsg && txMsg.value && txMsg.value.msg &&
            txMsg.value.msg.length && txMsg.value.msg[0].value) || {}
    }

    getPath = () => {
        let meta = TypeMeta[this.state.actionType];
        return `${meta.pathPreFix}/${this.state.user}/${meta.pathSuffix}`;
    }

    simulate = () => {
        if (this.state.simulating) return
        this.initStateOnLoad('simulating')
        try {
            this.createMessage(this.runSimulatation);
        } catch (e) {
            this.setStateOnError('simulating', e.message)
        }
    }

    runSimulatation = (txMsg, simulateBody) => {
        let gasAdjustment = TypeMeta[this.state.actionType].gasAdjustment || DEFAULT_GAS_ADJUSTMENT;
        Meteor.call('transaction.simulate', simulateBody, this.state.user, this.getPath(), gasAdjustment, (err, res) => {
            if (res) {
                if (res === '0') {
                    res = '300000'
                }
                Ledger.applyGas(txMsg, res, Meteor.settings.public.gasPrice, Coin.StakingCoin.denom);
                this.setStateOnSuccess('simulating', {
                    gasEstimate: res,
                    activeTab: '3',
                    txMsg: txMsg
                })
            }
            else {
                this.setStateOnError('simulating', 'something went wrong')
            }
        })
    }

    sign = () => {
        if (this.state.signing) return
        this.initStateOnLoad('signing')
        try {
            let txMsg = this.state.txMsg;
            const txContext = this.getTxContext();
            const bytesToSign = Ledger.getBytesToSign(txMsg, txContext);
            this.ledger.sign(bytesToSign).then((sig) => {
                try {
                    Ledger.applySignature(txMsg, txContext, sig);
                    Meteor.call('transaction.submit', txMsg, (err, res) => {
                        if (err) {
                            this.setStateOnError('signing', err.reason)
                        } else if (res) {
                            this.setStateOnSuccess('signing', {
                                txHash: res,
                                activeTab: '4'
                            })
                        }
                    })
                } catch (e) {
                    this.setStateOnError('signing', e.message)
                }
            }, (err) => this.setStateOnError('signing', err.message))

        } catch (e) {
            this.setStateOnError('signing', e.message)
        }
    }

    handleInputChange = (e) => {
        let target = e.currentTarget;
        let dataset = target.dataset;
        let value;

        switch (dataset.type) {
            case 'validator':
                value = { moniker: dataset.moniker, operator_address: dataset.address }
                break;
            case 'coin':
                value = new Coin(target.value, target.nextSibling.innerText)
                break;
            case 'hash':
                value = target.value.toUpperCase()
                break;
            default:
                value = target.value;
        }
        this.setState({ [target.name]: value })
    }

    redirectToSignin = () => {
        let params = {
            ...this.state.params,
            ...this.populateRedirectParams(),
        };
        this.close()
        this.props.history.push(this.props.history.location.pathname + '?signin&' + qs.stringify(params))
    }

    populateRedirectParams = () => {
        return { action: this.state.actionType }
    }

    isDataValid = () => {
        return this.state.currentUser != undefined;
    }

    getActionButton = () => {
        if (this.state.activeTab === '0')
            return <Button color="primary" onClick={this.redirectToSignin}>Sign in With Ledger</Button>
        if (this.state.activeTab === '1')
            return <Button color="primary" onClick={this.tryConnect}>Continue</Button>
        if (this.state.activeTab === '2')
            return <Button color="primary" disabled={this.state.simulating || !this.isDataValid()} onClick={this.simulate}>
                {(this.state.errorMessage !== '') ? 'Retry' : 'Next'}
            </Button>
        if (this.state.activeTab === '3')
            return <Button color="primary" disabled={this.state.signing} onClick={this.sign}>
                {(this.state.errorMessage !== '') ? 'Retry' : 'Sign'}
            </Button>
    }

    openModal = (type, params = {}) => {
        if (!TypeMeta[type]) {
            console.warn(`action type ${type} not supported`)
            return;
        }
        this.setState({
            ...params,
            actionType: type,
            isOpen: true,
            params: params
        })
    }

    getValidatorOptions = () => {
        let activeValidators = Validators.find(
            { "jailed": false, "status": 2 },
            { "sort": { "description.moniker": 1 } }
        );
        let redelegations = this.state.redelegations || {};
        let maxEntries = this.props.stakingParams.max_entries;
        return <UncontrolledDropdown direction='down' size='sm' className='redelegate-validators'>
            <DropdownToggle caret={true}>
                {this.state.targetValidator ? this.state.targetValidator.moniker : 'Select a Validator'}
            </DropdownToggle>
            <DropdownMenu modifiers={maxHeightModifier}>
                {activeValidators.map((validator, i) => {
                    if (validator.address === this.props.validator.address) return null

                    let redelegation = redelegations[validator.operator_address]
                    let disabled = redelegation && (redelegation.count >= maxEntries);
                    let completionTime = disabled ? <TimeStamp time={redelegation.completionTime} /> : null;
                    let id = `validator-option${i}`
                    return <div id={id} className={`validator disabled-btn-wrapper${disabled ? ' disabled' : ''}`} key={i}>
                        <DropdownItem name='targetValidator'
                            onClick={this.handleInputChange} data-type='validator' disabled={disabled}
                            data-moniker={validator.description.moniker} data-address={validator.operator_address}>
                            <Row>
                                <Col xs='12' className='moniker'>{validator.description.moniker}</Col>
                                <Col xs='3' className="voting-power data">
                                    <i className="material-icons">power</i>
                                    {validator.voting_power ? numbro(validator.voting_power).format('0,0') : 0}
                                </Col>

                                <Col xs='4' className="commission data">
                                    <i className="material-icons">call_split</i>
                                    {numbro(validator.commission.rate).format('0.00%')}
                                </Col>
                                <Col xs='5' className="uptime data">
                                    <Progress value={validator.uptime} style={{ width: '80%' }}>
                                        {validator.uptime ? numbro(validator.uptime / 100).format('0%') : 0}
                                    </Progress>
                                </Col>
                            </Row>
                        </DropdownItem>
                        {disabled ? <UncontrolledTooltip placement='bottom' target={id}>
                            <span>You have {maxEntries} regelegations from {this.props.validator.description.moniker}
                                 to {validator.description.moniker},
                                you cannot redelegate until {completionTime}</span>
                        </UncontrolledTooltip> : null}
                    </div>
                })}
            </DropdownMenu>
        </UncontrolledDropdown>
    }

    getWarningMessage = () => {
        return null
    }

    renderConfirmationTab = () => {
        if (!this.state.actionType) return;
        return <TabPane tabId="3">
            <div className='action-summary-message'>{this.getConfirmationMessage()}</div>
            <div className='warning-message'>{this.getWarningMessage()}</div>
            <div className='confirmation-message'>If that's correct, please click next and sign in your ledger device.</div>
        </TabPane>
    }

    renderModal = () => {
        return <Modal isOpen={this.state.isOpen} toggle={this.close} className="ledger-modal">
            <ModalBody >
                <TabContent className='ledger-modal-tab' activeTab={this.state.activeTab}>
                    <TabPane tabId="0"></TabPane>
                    <TabPane tabId="1">
                        Please connect your Ledger device and open Cosmos App.
                    </TabPane>
                    {this.renderActionTab()}
                    {this.renderConfirmationTab()}
                    <TabPane tabId="4">
                        <div>Transaction is broadcasted.  Verify it at
                            <Link to={`/transactions/${this.state.txHash}?new`}> transaction page. </Link>
                        </div>
                        <div>See your activities at <Link to={`/account/${this.state.user}`}>your account page</Link>.</div>
                    </TabPane>
                </TabContent>
                {this.state.loading ? <Spinner type="grow" color="primary" /> : ''}
                <p className="error-message">{this.state.errorMessage}</p>
            </ModalBody>
            <ModalFooter>
                {this.getActionButton()}
                <Button color="secondary" disabled={this.state.signing} onClick={this.close}>Cancel</Button>
            </ModalFooter>
        </Modal>
    }
}

class DelegationButtons extends LedgerButton {
    constructor(props) {
        super(props);
    }


    getDelegatedToken = (currentDelegation) => {
        if (currentDelegation && currentDelegation.shares && currentDelegation.tokenPerShare) {
            return new Coin(currentDelegation.shares * currentDelegation.tokenPerShare);
        }
        return null
    }

    supportAction(action) {
        return action === Types.DELEGATE || action === Types.REDELEGATE || action === Types.UNDELEGATE;
    }

    isDataValid = () => {
        if (!this.state.currentUser) return false;
        let maxAmount;
        if (this.state.actionType === Types.DELEGATE) {
            maxAmount = this.state.currentUser.availableCoin;
        } else {
            maxAmount = this.getDelegatedToken(this.props.currentDelegation);
        }
        let isValid = isBetween(this.state.delegateAmount, 1, maxAmount)

        if (this.state.actionType === Types.REDELEGATE)
            isValid = isValid || (this.state.targetValidator &&
                this.state.targetValidator.operator_address &&
                isValidatorAddress(this.state.targetValidator.operator_address))
        return isValid
    }

    renderActionTab = () => {
        if (!this.state.currentUser) return null
        let action;
        let target;
        let maxAmount;
        let availableStatement;

        let moniker = this.props.validator.description && this.props.validator.description.moniker;
        let validatorAddress = <span className='ellipic'>this.props.validator.operator_address</span>;
        switch (this.state.actionType) {
            case Types.DELEGATE:
                action = 'Delegate to';
                maxAmount = this.state.currentUser.availableCoin;
                availableStatement = 'your available balance:'
                break;
            case Types.REDELEGATE:
                action = 'Redelegate from';
                target = this.getValidatorOptions();
                maxAmount = this.getDelegatedToken(this.props.currentDelegation);
                availableStatement = 'your delegated tokens:'
                break;
            case Types.UNDELEGATE:
                action = 'Undelegate from';
                maxAmount = this.getDelegatedToken(this.props.currentDelegation);
                availableStatement = 'your delegated tokens:'
                break;
        }
        return <TabPane tabId="2" className="modal-body">
            <h3>{action} {moniker ? moniker : validatorAddress} {target ? 'to' : ''} {target}</h3>
            <InputGroup>
                <Input name="delegateAmount" onChange={this.handleInputChange} data-type='coin'
                    placeholder="Amount" min={Coin.MinStake} max={maxAmount.stakingAmount} type="number"
                    invalid={this.state.delegateAmount != null && !isBetween(this.state.delegateAmount, 1, maxAmount)} />
                <InputGroupAddon addonType="append">{Coin.StakingCoin.displayName}</InputGroupAddon>
            </InputGroup>
            <Input name="memo" onChange={this.handleInputChange}
                placeholder="Memo(optional)" type="textarea" value={this.state.memo} />
            <div>{availableStatement} <Amount coin={maxAmount} /> </div>
        </TabPane>
    }

    getWarningMessage = () => {
        let duration = this.props.stakingParams ? (this.props.stakingParams.params.unbonding_time) : null;
        let maxEntries = this.props.stakingParams ? this.props.stakingParams.params.max_entries : null;
        let warning = TypeMeta[this.state.actionType].warning;
        return warning && warning(duration, maxEntries);
    }

    getConfirmationMessage = () => {
        switch (this.state.actionType) {
            case Types.DELEGATE:
                return <span>You are going to <span className='action'>delegate</span> <Amount coin={this.state.delegateAmount} /> to <AccountTooltip address={this.props.validator.operator_address} sync /> with <Fee gas={this.state.gasEstimate} />.</span>
            case Types.REDELEGATE:
                return <span>You are going to <span className='action'>redelegate</span> <Amount coin={this.state.delegateAmount} /> from <AccountTooltip address={this.props.validator.operator_address} sync /> to <AccountTooltip address={this.state.targetValidator && this.state.targetValidator.operator_address} sync /> with <Fee gas={this.state.gasEstimate} />.</span>
            case Types.UNDELEGATE:
                return <span>You are going to <span className='action'>undelegate</span> <Amount coin={this.state.delegateAmount} /> from <AccountTooltip address={this.props.validator.operator_address} sync /> with <Fee gas={this.state.gasEstimate} />.</span>
        }
    }

    renderRedelegateButtons = () => {
        let delegation = this.props.currentDelegation;
        if (!delegation) return null;
        let completionTime = delegation.redelegationCompletionTime;
        let isCompleted = !completionTime || new Date() >= completionTime;
        let maxEntries = this.props.stakingParams.max_entries;
        let canUnbond = !delegation.unbonding || maxEntries > delegation.unbonding;
        return <span>
            <div id='redelegate-button' className={`disabled-btn-wrapper${isCompleted ? '' : ' disabled'}`}>
                <Button color="danger" size="sm" disabled={!isCompleted}
                    onClick={() => this.openModal(Types.REDELEGATE)}>
                    {TypeMeta[Types.REDELEGATE].button}
                </Button>
                {isCompleted ? null : <UncontrolledTooltip placement='bottom' target='redelegate-button'>
                    <span>You have incompleted regelegation to this validator,
                        you can't redelegate until <TimeStamp time={completionTime} />
                    </span>
                </UncontrolledTooltip>}
            </div>
            <div id='undelegate-button' className={`disabled-btn-wrapper${canUnbond ? '' : ' disabled'}`}>
                <Button color="warning" size="sm" disabled={!canUnbond}
                    onClick={() => this.openModal(Types.UNDELEGATE)}>
                    {TypeMeta[Types.UNDELEGATE].button}
                </Button>
                {canUnbond ? null : <UncontrolledTooltip placement='bottom' target='undelegate-button'>
                    <span>You reached maximum {maxEntries} unbonding delegation entries,
                        you can't delegate until the first one matures at <TimeStamp time={delegation.unbondingCompletionTime} />
                    </span>
                </UncontrolledTooltip>}
            </div>
        </span>
    }

    render = () => {
        return <span className="ledger-buttons-group float-right">
            {isActiveValidator(this.props.validator) ? <Button color="success"
                size="sm" onClick={() => this.openModal(Types.DELEGATE)}>
                {TypeMeta[Types.DELEGATE].button}
            </Button> : null}
            {this.renderRedelegateButtons()}
            {this.renderModal()}
        </span>;
    }
}

class WithdrawButton extends LedgerButton {

    createMessage = (callback) => {
        Meteor.call('transaction.execute', { from: this.state.user }, this.getPath(), (err, res) => {
            if (res) {
                if (this.props.address) {
                    res.value.msg.push({
                        type: 'cosmos-sdk/MsgWithdrawValidatorCommission',
                        value: { validator_address: this.props.address }
                    })
                }
                callback(res, res)
            }
            else {
                this.setState({
                    loading: false,
                    simulating: false,
                    errorMessage: 'something went wrong'
                })
            }
        })
    }

    supportAction(action) {
        return action === Types.WITHDRAW;
    }

    renderActionTab = () => {
        return <TabPane tabId="2" className="modal-body">
            <h3 className="text-center pt-2">Withdraw <img src="/img/kava-symbol.png" className="symbol-img mb-1" /> KAVA Rewards from </h3>
            <h3 className="text-center pb-4"> all delegations</h3>
            {this.props.rewards ? <div className="px-4">Your current rewards amount is: <CoinAmount amount={this.props.rewards} denom={this.props.denom} /></div> : ''}
            {this.props.commission ? <div className="px-4">Your current commission amount is: <CoinAmount amount={this.props.commission} denom={this.props.denom} /></div> : ''}
        </TabPane>
    }

    getConfirmationMessage = () => {
        return <span>You are going to <span className='action'>withdraw</span> rewards <CoinAmount amount={this.props.rewards} denom={this.props.denom} />
            {this.props.commission ? <span> and commission <CoinAmount amount={this.props.commission} denom={this.props.denom} /></span> : null}
            <span> with  <Fee gas={this.state.gasEstimate} />.</span>
        </span>
    }

    render = () => {
        return <span className="ledger-buttons-group float-right px-2">
            <Button color="success" size="sm" disabled={!this.props.rewards}
                onClick={() => this.openModal(Types.WITHDRAW)}>
                {TypeMeta[Types.WITHDRAW].button}
            </Button>
            {this.renderModal()}
        </span>;
    }
}

class TransferButton extends LedgerButton {

    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            total: props.total,
            totalKavaAvailable: 0,
        }
    }

    updateTotalKava = () => {
        this.state.total.forEach((item, i) => {

            if (item.denom === Meteor.settings.public.bondDenom) {
                this.setState({
                    totalKavaAvailable: item,
                })
            }
        })
    }

    componentDidMount() {
        this.updateTotalKava();
    }


    renderActionTab = () => {
        if (!this.state.currentUser) return null;
        let maxAmount = this.state.currentUser.availableCoin;
        console.log(this.state.totalKavaAvailable)
        return <TabPane tabId="2" className="modal-body">
            <h3 className="text-center pb-5 pt-2">Transfer <img src="/img/kava-symbol.png" className="symbol-img  mb-1" /> {Coin.StakingCoin.displayName}</h3>
            <FormGroup>
                <Label for="deposit" className="mb-n4"><T>transactions.address</T></Label>
                <InputGroup className="modal-create-cdp py-n5">
                    <InputGroupAddon addonType="prepend">
                        <InputGroupText className="modal-create-cdp"><i className="fas fa-user px-1"></i></InputGroupText>
                    </InputGroupAddon>
                    <Input name="transferTarget" onChange={this.handleInputChange}
                        placeholder="Send to" type="text"
                        value={this.state.transferTarget}
                        invalid={this.state.transferTarget != null && !isAddress(this.state.transferTarget)} className="modal-create-cdp " />
                </InputGroup>
            </FormGroup>

            <FormGroup>
                <Label for="address" className="mb-n4"><T>transactions.amount</T></Label>
                <FormText className="coin-available mb-n5 float-right">Max {new Coin(Math.floor(this.state.totalKavaAvailable.amount), this.state.totalKavaAvailable.denom).toString(4)}</FormText>
                <InputGroup className="modal-create-cdp py-n5" >
                    <InputGroupAddon addonType="prepend">
                        <InputGroupText className="modal-create-cdp"><img src="/img/kava-symbol.png" className="symbol-img " /> </InputGroupText>
                    </InputGroupAddon>
                    <Input name="transferAmount" onChange={this.handleInputChange}
                        data-type='coin' placeholder="Amount"
                        min={Coin.MinStake} max={this.state.totalKavaAvailable.amount} type="number"
                        invalid={this.state.transferAmount != null && !isBetween(this.state.transferAmount, 1, this.state.totalKavaAvailable.amount)} className="modal-create-cdp " />

                    <InputGroupAddon addonType="append">
                        <InputGroupText className=" modal-create-cdp font-weight-bold">{Coin.StakingCoin.displayName}</InputGroupText>
                    </InputGroupAddon>
                </InputGroup>
            </FormGroup>

            <FormGroup>
                <InputGroup className="modal-create-cdp py-n5">
                    <Input name="memo" onChange={this.handleInputChange}
                        placeholder="Memo(optional)" type="textarea" value={this.state.memo} />
                </InputGroup>
            </FormGroup>
        </TabPane>
    }

    supportAction(action) {
        return action === Types.SEND;
    }

    filterParams(params) {
        return {
            transferTarget: params.transferTarget
        }
    }

    isDataValid = () => {
        if (!this.state.currentUser) return false
        return isBetween(this.state.transferAmount, 1, this.state.totalKavaAvailable.amount)
    }

    getConfirmationMessage = () => {
        return <span>You are going to <span className='action'>send</span> <Amount coin={this.state.transferAmount} /> to {this.state.transferTarget}
            <span> with <Fee gas={this.state.gasEstimate} />.</span>
        </span>
    }

    render = () => {
        let params = {};
        let button = TypeMeta[Types.SEND].button;
        if (this.props.address !== this.state.user) {
            params = { transferTarget: this.props.address }
            button = TypeMeta[Types.SEND].button_other
        }
        return <span className="ledger-buttons-group float-right px-2">
            <Button color="info" size="sm" onClick={() => this.openModal(Types.SEND, params)}> {button} </Button>
            {this.renderModal()}
        </span>;
    }
}

class SubmitProposalButton extends LedgerButton {
    renderActionTab = () => {
        if (!this.state.currentUser) return null;
        let maxAmount = this.state.currentUser.availableCoin;
        return <TabPane tabId="2" className="modal-body">
            <h3>Submit A New Proposal</h3>
            <InputGroup>
                <Input name="proposalTitle" onChange={this.handleInputChange}
                    placeholder="Title" type="text"
                    value={this.state.proposalTitle} />
            </InputGroup>
            <InputGroup>
                <Input name="proposalDescription" onChange={this.handleInputChange}
                    placeholder="Description" type="textarea"
                    value={this.state.proposalDescription} />
            </InputGroup>
            <InputGroup>
                <Input name="depositAmount" onChange={this.handleInputChange}
                    data-type='coin' placeholder="Amount"
                    min={Coin.MinStake} max={maxAmount.stakingAmount} type="number"
                    invalid={this.state.depositAmount != null && !isBetween(this.state.depositAmount, 1, maxAmount)} />
                <InputGroupAddon addonType="append">{Coin.StakingCoin.displayName}</InputGroupAddon>
            </InputGroup>
            <Input name="memo" onChange={this.handleInputChange}
                placeholder="Memo(optional)" type="textarea" value={this.state.memo} />
            <div>your available balance: <Amount coin={maxAmount} /></div>
        </TabPane>
    }

    getSimulateBody(txMsg) {
        txMsg = (txMsg && txMsg.value && txMsg.value.msg &&
            txMsg.value.msg.length && txMsg.value.msg[0].value) || {}
        return {
            ...txMsg.content.value,
            initial_deposit: txMsg.initial_deposit,
            proposer: txMsg.proposer,
            proposal_type: "text"
        }
    }

    getPath = () => {
        return TypeMeta[Types.SUBMITPROPOSAL].path
    }

    supportAction(action) {
        return action === Types.SUBMITPROPOSAL;
    }


    isDataValid = () => {
        if (!this.state.currentUser) return false
        return this.state.proposalTitle != null && this.state.proposalDescription != null && isBetween(this.state.depositAmount, 1, this.state.currentUser.availableCoin)
    }

    getConfirmationMessage = () => {
        return <span>You are going to <span className='action'>submit</span> a new proposal.
            <div>
                <h3> {this.state.proposalTitle} </h3>
                <div> {this.state.proposalDescription} </div>
                <div> Initial Deposit:
                    <Amount coin={this.state.depositAmount} />
                </div>
                <span> Fee: <Fee gas={this.state.gasEstimate} />.</span>
            </div>
        </span>
    }

    render = () => {
        return <span className="ledger-buttons-group float-right">
            <Button color="info" size="sm" onClick={() => this.openModal(Types.SUBMITPROPOSAL, {})}> {TypeMeta[Types.SUBMITPROPOSAL].button} </Button>
            {this.renderModal()}
        </span>;
    }
}

class ProposalActionButtons extends LedgerButton {

    renderActionTab = () => {
        if (!this.state.currentUser) return null;
        let maxAmount = this.state.currentUser.availableCoin;

        let inputs;
        let title;
        switch (this.state.actionType) {
            case Types.VOTE:
                title = `Vote on Proposal ${this.props.proposalId}`
                inputs = (<Input type="select" name="voteOption" onChange={this.handleInputChange} defaultValue=''>
                    <option value='' disabled>Vote Option</option>
                    <option value='Yes'>yes</option>
                    <option value='Abstain'>abstain</option>
                    <option value='No'>no</option>
                    <option value='NoWithVeto'>no with veto</option>
                </Input>)
                break;
            case Types.DEPOSIT:
                title = `Deposit to Proposal ${this.props.proposalId}`
                inputs = (<InputGroup>
                    <Input name="depositAmount" onChange={this.handleInputChange}
                        data-type='coin' placeholder="Amount"
                        min={Coin.MinStake} max={maxAmount.stakingAmount} type="number"
                        invalid={this.state.depositAmount != null && !isBetween(this.state.depositAmount, 1, maxAmount)} />
                    <InputGroupAddon addonType="append">{Coin.StakingCoin.displayName}</InputGroupAddon>
                    <div>your available balance: <Amount coin={maxAmount} /></div>
                </InputGroup>)
                break;
        }
        return <TabPane tabId="2" className="modal-body">
            <h3>{title}</h3>
            {inputs}
            <Input name="memo" onChange={this.handleInputChange}
                placeholder="Memo(optional)" type="textarea" value={this.state.memo} />
        </TabPane>

    }

    /*getSimulateBody (txMsg) {
        txMsg = txMsg && txMsg.value && txMsg.value.msg &&
            txMsg.value.msg.length && txMsg.value.msg[0].value || {}
        return {...txMsg.content.value,
            initial_deposit: txMsg.initial_deposit,
            proposer: txMsg.proposer,
            proposal_type: "text"
        }
    }*/

    getPath = () => {
        let { pathPreFix, pathSuffix } = TypeMeta[this.state.actionType];
        return `${pathPreFix}/${this.props.proposalId}/${pathSuffix}`
    }

    supportAction(action) {
        return action === Types.VOTE || action === Types.DEPOSIT;
    }


    isDataValid = () => {
        if (!this.state.currentUser) return false
        if (this.state.actionType === Types.VOTE) {
            return ['Yes', 'No', 'NoWithVeto', 'Abstain'].indexOf(this.state.voteOption) !== -1;
        } else {
            return isBetween(this.state.depositAmount, 1, this.state.currentUser.availableCoin)
        }
    }

    getConfirmationMessage = () => {
        switch (this.state.actionType) {
            case Types.VOTE:
                return <span>You are <span className='action'>voting</span> <strong>{this.state.voteOption}</strong> on proposal {this.props.proposalId}
                    <span> with <Fee gas={this.state.gasEstimate} />.</span>
                </span>
                break;
            case Types.DEPOSIT:
                return <span>You are <span className='action'>deposit</span> <Amount coin={this.state.depositAmount} /> to proposal {this.props.proposalId}
                    <span> with <Fee gas={this.state.gasEstimate} />.</span>
                </span>
                break;
        }
    }

    render = () => {
        return <span className="ledger-buttons-group float-right">
            <Row>
                <Col><Button color="secondary" size="sm"
                    onClick={() => this.openModal(Types.VOTE, {})}>
                    {TypeMeta[Types.VOTE].button}
                </Button></Col>
                <Col><Button color="success" size="sm"
                    onClick={() => this.openModal(Types.DEPOSIT, {})}>
                    {TypeMeta[Types.DEPOSIT].button}
                </Button></Col>
            </Row>
            {this.renderModal()}
        </span>;
    }
}



class ClaimSwapButton extends LedgerButton {

    renderActionTab = () => {
        if (!this.state.currentUser) return null;
        return <TabPane tabId="2" className="modal-body">
            <h3 className="text-center pb-4 pt-2">Claim <img src="/img/bnb-symbol.svg" className="symbol-img mb-1" /> BNB Swap</h3>
            <FormGroup>
                <Label for="swapID" className="mb-n4"><T>cdp.swapID</T></Label>
                <InputGroup className="modal-create-cdp py-n5">
                    <InputGroupAddon addonType="prepend">
                        <InputGroupText className="modal-create-cdp"><i className="fas fa-stream px-1"></i></InputGroupText>
                    </InputGroupAddon>
                    <Input name="swapID" onChange={this.handleInputChange}
                        placeholder="Swap ID" type="text" value={this.state.swapID} data-type='hash'
                        invalid={this.state.swapID === null} className="modal-create-cdp " />
                </InputGroup>
            </FormGroup>

            <FormGroup>
                <Label for="swapRandNum" className="mb-n4"><T>cdp.swapRandNum</T></Label>
                <InputGroup className="modal-create-cdp py-n5">
                    <InputGroupAddon addonType="prepend">
                        <InputGroupText className="modal-create-cdp"><i className="fas fa-exchange-alt px-1"></i></InputGroupText>
                    </InputGroupAddon>
                    <Input name="swapRandomNumber" onChange={this.handleInputChange}
                        placeholder="Swap Random Number" type="text" data-type='hash'
                        value={this.state.swapRandomNumber}
                        invalid={this.state.swapRandomNumber === null} className="modal-create-cdp " />
                </InputGroup>
            </FormGroup>

            <FormGroup>
                <Label for="memo"><T>cdp.memo</T></Label>
                <InputGroup className="modal-create-cdp py-n5">
                    <Input name="memo" onChange={this.handleInputChange}
                        placeholder="Memo(optional)" type="textarea" value={this.state.memo} />
                </InputGroup>
            </FormGroup>
        </TabPane>
    }

    supportAction(action) {
        return action === Types.CLAIMSWAP;
    }

    getConfirmationMessage = () => {
        return <span>You are going to <span className='action'>claim</span> swap for address <b>{this.state.user} </b>
         with <Fee gas={this.state.gasEstimate} />.</span>
    }

    getPath = () => {
        let meta = TypeMeta[this.state.actionType];
        return `${meta.pathPreFix}`;
    }



    render = () => {
        return <span className="ledger-buttons-group float-right pl-2">
            <Button color="primary" size="sm" onClick={() => this.openModal(Types.CLAIMSWAP, {})}> {TypeMeta[Types.CLAIMSWAP].button} </Button>
            {this.renderModal()}
        </span>;
    }
}


class CreateCDPButton extends LedgerButton {

    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            ratio: 0,
            collateral: 0,
            debt: 0,
            maxAmount: props.bnbTotalValue / Meteor.settings.public.coins[1].fraction,
        }
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        let maxAmount = nextProps.bnbTotalValue / Meteor.settings.public.coins[1].fraction;
        if (!_.isEqual(maxAmount, prevState.maxAmount)) {

            return { maxAmount: maxAmount }
        }
        else return null;
    }

    handleChange = (e) => {
        const { target } = e;
        const value = target.value;
        const { name } = target;
        this.setState({
            [name]: value,
        }, () => {
            this.setState({
                ratio: this.state.collateral * this.props.price / this.state.debt
            })
        });
    }

    renderActionTab = () => {
        if (!this.state.currentUser) return null;
        return <TabPane tabId="2" className="modal-body">
            <h3 className="text-center pb-5 pt-2">Create CDP with <img src="/img/bnb-symbol.svg" className="symbol-img" /> BNB</h3>
            <FormGroup>
                <Label for="collateral" className="mb-n4"><T>cdp.collateral</T></Label>
                <FormText className="coin-available mb-n5 float-right">Max {new Coin(this.state.maxAmount, this.props.collateral).convertToString()}</FormText>
                <InputGroup className="modal-create-cdp py-n5">
                    <InputGroupAddon addonType="prepend">
                        <InputGroupText className="modal-create-cdp"><img src="/img/bnb-symbol.svg" className="symbol-img" /> </InputGroupText>
                    </InputGroupAddon>

                    <Input placeholder="Collateral Amount" name="collateral" value={this.state.collateral} onChange={this.handleChange} type="number"
                        min={Coin.MinStake} max={this.state.maxAmount}
                        invalid={this.state.collateral != null && !isBetween(this.state.collateral, 0, this.state.maxAmount)} className="modal-create-cdp " />
                    <InputGroupAddon addonType="append">
                        <InputGroupText className=" modal-create-cdp font-weight-bold">BNB</InputGroupText>
                    </InputGroupAddon>
                </InputGroup>
            </FormGroup>



            <FormGroup>
                <Label for="debt" className="mb-n4"><T>cdp.debt</T></Label>
                <FormText invalid={true} className="coin-available mb-n5 float-right">The minimum debt is {this.props.cdpParams / Meteor.settings.public.coins[5].fraction} USDX </FormText>
                <InputGroup className="modal-create-cdp py-n5">
                    <FormFeedback invalid className="coin-available ">The minimum debt is {this.props.cdpParams / Meteor.settings.public.coins[5].fraction} USDX </FormFeedback>
                    <InputGroupAddon addonType="prepend">
                        <InputGroupText className="modal-create-cdp"><img src="/img/usdx-symbol.svg" className="symbol-img" /> </InputGroupText>
                    </InputGroupAddon>

                    <Input invalid={(this.state.debt < this.props.cdpParams / Meteor.settings.public.coins[5].fraction)} placeholder="Debt Amount" name="debt" value={this.state.debt} type="number" onChange={this.handleChange} className="modal-create-cdp " />
                    <InputGroupAddon addonType="append">
                        <InputGroupText className="modal-create-cdp font-weight-bold">USDX</InputGroupText>
                    </InputGroupAddon>
                    {/* <FormFeedback invalid={true} className="coin-available mb-n5 float-right">The minimum debt is {this.props.cdpParams / Meteor.settings.public.coins[5].fraction} USDX </FormFeedback> */}

                </InputGroup>

            </FormGroup>


            <FormGroup>
                <InputGroup >
                    <InputGroupAddon addonType="prepend">
                        <Label for="collateral" className="mt-3"><T>cdp.collateralizationRatio</T></Label>
                    </InputGroupAddon>


                    <Input invalid={!((this.state.ratio !== Infinity) && (this.state.ratio >= this.props.collateralizationRatio))}
                        className={((this.state.ratio !== Infinity) && (this.state.ratio >= this.props.collateralizationRatio)) ? 'modal-create-cdp text-success text-right mt-2' : 'modal-create-cdp text-danger text-right mt-2 pr-5'}
                        value={((this.state.ratio !== Infinity) && (this.state.ratio > 0)) ? numbro(this.state.ratio).format({ mantissa: 6 }) : numbro(this.state.ratio).format({ mantissa: 6 })}
                        disabled={true} />
                    {/* <FormFeedback className="coin-available mb-n5 float-right">The minimum debt is {this.props.cdpParams / Meteor.settings.public.coins[5].fraction} USDX </FormFeedback> */}

                </InputGroup>

            </FormGroup>


            <FormGroup className="mb-n4" >
                <Label for="memo" className="mb-n4"><T>cdp.memo</T></Label>
                <Input name="memo" onChange={this.handleInputChange} className="mb-n4"
                    placeholder="Memo(optional)" type="textarea" value={this.state.memo} />
            </FormGroup>
        </TabPane >

    }

    supportAction(action) {
        return action === Types.CREATECDP
    }

    isDataValid = () => {
        if (!this.state.currentUser) return false
        return isBetween(this.state.collateral, 0.00000001, this.state.maxAmount) && isBetween(this.state.debt, this.props.cdpParams / Meteor.settings.public.coins[5].fraction, numbro(this.state.collateral * this.props.price / this.props.collateralizationRatio));

    }


    getConfirmationMessage = () => {
        return <span>You are going to <span className='action'>create CDP</span> with <span className='coin'>{new Coin(this.state.collateral, this.props.collateral).convertToString()}</span> for address <b>{this.state.user} </b>
     with <Fee gas={this.state.gasEstimate} />.</span>
    }

    getPath = () => {
        let meta = TypeMeta[this.state.actionType];
        return `${meta.pathPreFix}`;
    }


    render = () => {
        return <span className="ledger-buttons-group button">
            <Button color="warning" size="sm" onClick={() => this.openModal(Types.CREATECDP, {})}> {TypeMeta[Types.CREATECDP].button} </Button>
            {this.renderModal()}
        </span>;
    }
}


class DepositCDPButton extends LedgerButton {

    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            collateral: 0,
            collateralDenom: props.collateral,
            maxAmount: props.bnbTotalValue / Meteor.settings.public.coins[1].fraction,
            ratio: ((parseInt(props.collateralDeposited) / Meteor.settings.public.coins[1].fraction) * parseFloat(props.price)) / (parseInt(props.principalDeposited) / Meteor.settings.public.coins[5].fraction),
            cdpOwner: props.cdpOwner,
        }
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        let maxAmount = nextProps.bnbTotalValue / Meteor.settings.public.coins[1].fraction;

        if (!_.isEqual(maxAmount, prevState.maxAmount)) {

            return { maxAmount: maxAmount }
        }
        else return null;
    }

    handleChange = (e) => {
        const { target } = e;
        const value = target.value;
        const { name } = target;
        this.setState({
            [name]: value,
        }, () => {
            this.setState({
                ratio: ((((parseInt(this.props.collateralDeposited) / Meteor.settings.public.coins[1].fraction) + parseFloat(this.state.collateral)) * parseFloat(this.props.price)) / (parseInt(this.props.principalDeposited) / Meteor.settings.public.coins[5].fraction)),
            })
        });
    }


    renderActionTab = () => {
        if (!this.state.currentUser) return null;
        return <TabPane tabId="2" className="modal-body">
            <h3 className="text-center pb-5">Deposit into CDP with <img src="/img/bnb-symbol.svg" className="symbol-img" /> BNB</h3>
            <FormGroup>
                <Label for="deposit" className="mb-n4"><T>cdp.deposit</T></Label>
                <FormText className="coin-available mb-n5 float-right">Max {new Coin(this.state.maxAmount, this.props.collateral).convertToString()}</FormText>
                <InputGroup className="modal-create-cdp py-n5">
                    <FormFeedback className="coin-available mb-n5 float-right">Max {new Coin(this.state.maxAmount, this.props.collateral).convertToString()}</FormFeedback>

                    <InputGroupAddon addonType="prepend">
                        <InputGroupText className="modal-create-cdp"><img src="/img/bnb-symbol.svg" className="symbol-img" /> </InputGroupText>
                    </InputGroupAddon>
                    <Input placeholder="Collateral Amount" name="collateral" value={this.state.collateral} onChange={this.handleChange}
                        min={Coin.MinStake} max={this.state.maxAmount}
                        invalid={this.state.collateral != null && !isBetween(this.state.collateral, 0, this.state.maxAmount)} className="modal-create-cdp " />
                    <FormFeedback className="coin-available mb-n5 float-right">Max {new Coin(this.state.maxAmount, this.props.collateral).convertToString()}</FormFeedback>

                    <InputGroupAddon addonType="append">
                        <InputGroupText className="modal-create-cdp font-weight-bold">BNB</InputGroupText>
                    </InputGroupAddon>
                </InputGroup>
            </FormGroup>

            <FormGroup>
                <InputGroup >
                    <InputGroupAddon addonType="prepend">
                        <Label for="collateral" className="mt-3"><T>cdp.collateralizationRatio</T></Label>
                    </InputGroupAddon>
                    <Input invalid={!((this.state.ratio !== Infinity) && (this.state.ratio > this.props.collateralizationRatio))}
                        className={((this.state.ratio !== Infinity) && (this.state.ratio > this.props.collateralizationRatio)) ? 'modal-create-cdp text-success text-right mt-2' : 'modal-create-cdp text-danger text-right mt-2 pr-5'}
                        value={((this.state.ratio !== Infinity) && (this.state.ratio > this.props.collateralizationRatio)) ? numbro(this.state.ratio).format({ mantissa: 6 }) : numbro(this.state.ratio).format({ mantissa: 6 })}
                        disabled={true} />


                </InputGroup>

            </FormGroup>

            <FormGroup className="mb-n4" >
                <Label for="memo" className="mb-n4"><T>cdp.memo</T></Label>
                <Input name="memo" onChange={this.handleInputChange} className="mb-n4"
                    placeholder="Memo(optional)" type="textarea" value={this.state.memo} />
            </FormGroup>

            {/* <FormGroup>
                <Label><T>cdp.collateralizationRatio</T></Label>
                <Input invalid={!((this.state.ratio !== Infinity) && (this.state.ratio > this.props.collateralizationRatio))}
                    className={((this.state.ratio !== Infinity) && (this.state.ratio > this.props.collateralizationRatio)) ? 'text-success' : 'text-danger'}
                    value={((this.state.ratio !== Infinity) && (this.state.ratio > this.props.collateralizationRatio)) ? numbro(this.state.ratio).format({ mantissa: 6 }) : numbro(this.state.ratio).format({ mantissa: 6 })}
                    disabled={true} />
                <FormFeedback>Collateralization ratio is danger! It must be greater than {this.props.collateralizationRatio}</FormFeedback>
            </FormGroup> */}
            {/* <FormGroup>
                <Label for="memo"><T>cdp.memo</T></Label>
                <Input name="memo" onChange={this.handleInputChange}
                    placeholder="Memo(optional)" type="textarea" value={this.state.memo} />
            </FormGroup> */}
            {/* <span className='coin'>Your available balance: {new Coin(this.state.maxAmount, this.props.collateral).convertToString(5)} </span> */}
        </TabPane>

    }

    supportAction(action) {
        return action === Types.DEPOSITCDP;
    }

    getConfirmationMessage = () => {
        return <span>You are going to <span className='action'>Deposit</span> <span className='coin'>{new Coin(this.state.collateral, this.props.collateral).convertToString()}</span> from address <b>{this.state.user} </b> into CDP for address <b>{this.state.cdpOwner} </b>
     with <Fee gas={this.state.gasEstimate} />.</span>
    }

    getPath = () => {
        let meta = TypeMeta[this.state.actionType];
        return `${meta.pathPreFix}/${this.state.cdpOwner}/${this.props.collateral}/${meta.pathSuffix}`
    }


    isDataValid = () => {
        if (!this.state.currentUser) return false
        return isBetween(this.state.collateral, 0.00000001, this.state.maxAmount)
    }


    render = () => {
        return <span className="ledger-buttons-group px-2">
            <Button color="warning" size="sm" onClick={() => this.openModal(Types.DEPOSITCDP, {})}> {TypeMeta[Types.DEPOSITCDP].button} </Button>
            {this.renderModal()}
        </span>;
    }
}


class WithdrawCDPButton extends LedgerButton {

    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            collateral: 0,
            collateralDenom: props.collateral,
            amount: 0,
            maxAmount: props.collateralDeposited / Meteor.settings.public.coins[1].fraction,
            ratio: ((parseInt(props.collateralDeposited) / Meteor.settings.public.coins[1].fraction) * parseFloat(props.price)) / (parseInt(props.principalDeposited) / Meteor.settings.public.coins[5].fraction),
            cdpOwner: props.cdpOwner,
            depositedValue: props.depositValue / Meteor.settings.public.coins[1].fraction,
            isDepositor: props.isDepositor
        }
        //console.log(this.state.isDepositor)
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        let maxAmount = nextProps.collateralDeposited / Meteor.settings.public.coins[1].fraction;
        let ratio = ((parseInt(nextProps.collateralDeposited) / Meteor.settings.public.coins[1].fraction) * parseFloat(nextProps.price)) / (parseInt(nextProps.principalDeposited) / Meteor.settings.public.coins[5].fraction);
        if (!_.isEqual(maxAmount, prevState.maxAmount)) {
            return {
                maxAmount: maxAmount,
                ratio: ratio
            }
        }
        else return null;
    }

    handleChange = (e) => {
        const { target } = e;
        const value = target.value;
        const { name } = target;
        this.setState({
            [name]: value,
        }, () => {
            let ratio = ((((parseInt(this.props.collateralDeposited) / Meteor.settings.public.coins[1].fraction) - parseFloat(this.state.collateral)) * parseFloat(this.props.price)) / ((parseInt(this.props.principalDeposited) / Meteor.settings.public.coins[5].fraction)));
            this.setState({
                ratio: ratio
            })
        });
    }


    renderActionTab = () => {
        if (!this.state.currentUser) return null;
        return <TabPane tabId="2" className="modal-body">
            <h3 className="text-center pb-5">Withdraw <img src="/img/bnb-symbol.svg" className="symbol-img" /> BNB from CDP </h3>
            <FormGroup>
                <Label for="withdraw" className="mb-n4"><T>cdp.withdraw</T></Label>
                <FormText className="coin-available mb-n5 float-right">Max {this.state.isDepositor ? new Coin(this.state.depositedValue, this.props.collateral).convertToString() : new Coin(this.state.maxAmount, this.props.collateral).convertToString()}</FormText>
                <InputGroup className="modal-create-cdp py-n5">
                    <InputGroupAddon addonType="prepend">
                        <InputGroupText className="modal-create-cdp"><img src="/img/bnb-symbol.svg" className="symbol-img" /> </InputGroupText>
                    </InputGroupAddon>

                    <Input placeholder="Collateral Amount" name="collateral" type="number" value={this.state.collateral} onChange={this.handleChange}
                        min={Coin.MinStake} max={this.state.maxAmount}
                        invalid={this.state.isDepositor ? this.state.collateral != null && !isBetween(this.state.collateral, 0, this.state.depositedValue) : this.state.collateral != null && !isBetween(this.state.collateral, 0, this.state.maxAmount)} className="modal-create-cdp " />
                    <InputGroupAddon addonType="append">
                        <InputGroupText className="modal-create-cdp font-weight-bold">BNB</InputGroupText>
                    </InputGroupAddon>
                </InputGroup>
            </FormGroup>

            <FormGroup>
                <InputGroup >
                    <InputGroupAddon addonType="prepend">
                        <Label for="collateral" className="mt-3"><T>cdp.collateralizationRatio</T></Label>
                    </InputGroupAddon>
                    <Input invalid={!((this.state.ratio !== Infinity) && (this.state.ratio > this.props.collateralizationRatio))}
                        className={((this.state.ratio !== Infinity) && (this.state.ratio > this.props.collateralizationRatio)) ? 'modal-create-cdp text-success text-right mt-2' : 'modal-create-cdp text-danger text-right mt-2 pr-5'}
                        value={((this.state.ratio !== Infinity) && (this.state.ratio > this.props.collateralizationRatio)) ? numbro(this.state.ratio).format({ mantissa: 6 }) : numbro(this.state.ratio).format({ mantissa: 6 })}
                        disabled={true} />
                </InputGroup>
            </FormGroup>

            <FormGroup className="mb-n4" >
                <Label for="memo" className="mb-n4"><T>cdp.memo</T></Label>
                <Input name="memo" onChange={this.handleInputChange} className="mb-n4"
                    placeholder="Memo(optional)" type="textarea" value={this.state.memo} />
            </FormGroup>
            {/* 
            <h3>Withdraw <img src="/img/bnb-symbol.svg" className="symbol-img" /> BNB from CDP</h3>
            <FormGroup>
                <Label for="collateral"><T>cdp.withdraw</T></Label>
                <Input placeholder="Collateral Amount" name="collateral" type="number" value={this.state.collateral} onChange={this.handleChange}
                    min={Coin.MinStake} max={this.state.maxAmount}
                    invalid={this.state.isDepositor ? this.state.collateral != null && !isBetween(this.state.collateral, 0, this.state.depositedValue) : this.state.collateral != null && !isBetween(this.state.collateral, 0, this.state.maxAmount)} />
                <FormText>The amount of BNB you would like to withdraw</FormText>
            </FormGroup> */}
            {/* <FormGroup>
                <Label><T>cdp.collateralizationRatio</T></Label>
                <Input invalid={!((this.state.ratio !== Infinity) && (this.state.ratio > this.props.collateralizationRatio))}
                    className={((this.state.ratio !== Infinity) && (this.state.ratio > this.props.collateralizationRatio)) ? 'text-success' : 'text-danger'}
                    value={((this.state.ratio !== Infinity) && (this.state.ratio > this.props.collateralizationRatio)) ? numbro(this.state.ratio).format({ mantissa: 6 }) : numbro(this.state.ratio).format({ mantissa: 6 })}
                    disabled={true} />
                <FormFeedback>Collateralization ratio is danger! It must be greater than {this.props.collateralizationRatio}</FormFeedback>
            </FormGroup> */}
            {/* <FormGroup>
                <Label for="memo"><T>cdp.memo</T></Label>
                <Input name="memo" onChange={this.handleInputChange}
                    placeholder="Memo(optional)" type="textarea" value={this.state.memo} />
            </FormGroup>
            <span className='coin'>Your available CDP balance: {this.state.isDepositor ? new Coin(this.state.depositedValue, this.props.collateral).convertToString() : new Coin(this.state.maxAmount, this.props.collateral).convertToString()} </span> */}
        </TabPane>
    }

    supportAction(action) {
        return action === Types.WITHDRAWCDP;
    }

    isDataValid = () => {
        if (!this.state.currentUser) return false
        return isBetween(this.state.collateral, 0.00000001, this.state.maxAmount)
    }


    getConfirmationMessage = () => {
        return this.props.collateral ? <span>You are going to <span className='action'>withdraw </span> <span className='coin'>{new Coin(this.state.collateral, this.props.collateral).convertToString(8)}</span> for address <b>{this.state.user} </b> from CDP with address <b>{this.state.cdpOwner} </b>
        with <Fee gas={this.state.gasEstimate} />.</span> : ''
    }

    getPath = () => {
        let meta = TypeMeta[this.state.actionType];
        return `${meta.pathPreFix}/${this.state.cdpOwner}/${this.props.collateral}/${meta.pathSuffix}`
    }




    render = () => {
        return <span className="ledger-buttons-group px-2">
            <Button color="success" size="sm" onClick={() => this.openModal(Types.WITHDRAWCDP, {})}> {TypeMeta[Types.WITHDRAWCDP].button} </Button>
            {this.renderModal()}
        </span>;
    }
}

class DrawDebtCDPButton extends LedgerButton {

    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            draw: 0,
            collateralDenom: props.collateral,
            maxAmount: props.principalDeposited / Meteor.settings.public.coins[5].fraction,
            ratio: ((parseInt(props.collateralDeposited) / Meteor.settings.public.coins[1].fraction) * parseFloat(props.price)) / (parseInt(props.principalDeposited) / Meteor.settings.public.coins[5].fraction),

        }
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        let maxAmount = nextProps.principalDeposited / Meteor.settings.public.coins[5].fraction;
        let ratio = ((parseInt(nextProps.collateralDeposited) / Meteor.settings.public.coins[1].fraction) * parseFloat(nextProps.price)) / (parseInt(nextProps.principalDeposited) / Meteor.settings.public.coins[5].fraction);
        if (!_.isEqual(maxAmount, prevState.maxAmount)) {

            return {
                maxAmount: maxAmount,
                ratio: ratio
            }
        }
        else return null;
    }

    handleChange = (e) => {
        const { target } = e;
        const value = target.value;
        const { name } = target;
        this.setState({
            [name]: value,
        }, () => {
            this.setState({
                ratio: (((parseInt(this.props.collateralDeposited) / Meteor.settings.public.coins[1].fraction) * parseFloat(this.props.price)) / ((parseInt(this.props.principalDeposited) / Meteor.settings.public.coins[5].fraction) + parseFloat(this.state.draw))),
            })
        });
    }


    renderActionTab = () => {
        if (!this.state.currentUser) return null;
        return <TabPane tabId="2" className="modal-body">
            <h3 className="text-center pb-5">Draw <img src="/img/usdx-symbol.svg" className="symbol-img mb-1" /> USDX from CDP </h3>
            <FormGroup>
                <Label for="draw" className="mb-n4"><T>cdp.draw</T></Label>
                <FormText className="coin-available mb-n5 float-right">Max {new Coin(this.state.maxAmount, this.props.principalDenom).convertToString()}</FormText>
                <InputGroup className="modal-create-cdp py-n5">
                    <InputGroupAddon addonType="prepend">
                        <InputGroupText className="modal-create-cdp"><img src="/img/usdx-symbol.svg" className="symbol-img" /> </InputGroupText>
                    </InputGroupAddon>

                    <Input placeholder="Draw Amount" name="draw" value={this.state.draw} type="number" onChange={this.handleChange}
                        min={Coin.MinStake} max={this.state.maxAmount}
                        invalid={this.state.draw != null && !isBetween(this.state.draw, 0, this.state.maxAmount)} className="modal-create-cdp " />
                    <InputGroupAddon addonType="append">
                        <InputGroupText className="modal-create-cdp font-weight-bold">USDX</InputGroupText>
                    </InputGroupAddon>
                </InputGroup>
            </FormGroup>

            <FormGroup>
                <InputGroup >
                    <InputGroupAddon addonType="prepend">
                        <Label for="collateral" className="mt-3"><T>cdp.collateralizationRatio</T></Label>
                    </InputGroupAddon>
                    <Input invalid={!((this.state.ratio !== Infinity) && (this.state.ratio > this.props.collateralizationRatio))}
                        className={((this.state.ratio !== Infinity) && (this.state.ratio > this.props.collateralizationRatio)) ? 'modal-create-cdp text-success text-right mt-2' : 'modal-create-cdp text-danger text-right mt-2 pr-5'}
                        value={((this.state.ratio !== Infinity) && (this.state.ratio > this.props.collateralizationRatio)) ? numbro(this.state.ratio).format({ mantissa: 6 }) : numbro(this.state.ratio).format({ mantissa: 6 })}
                        disabled={true} />
                </InputGroup>
            </FormGroup>
            <FormGroup className="mb-n4" >
                <Label for="memo" className="mb-n4"><T>cdp.memo</T></Label>
                <Input name="memo" onChange={this.handleInputChange} className="mb-n4"
                    placeholder="Memo(optional)" type="textarea" value={this.state.memo} />
            </FormGroup>
        </TabPane>
    }

    supportAction(action) {
        return action === Types.DRAWDEBT;
    }

    isDataValid = () => {
        if (!this.state.currentUser) return false
        return isBetween(this.state.draw, 0.000001, this.state.maxAmount)
    }

    getConfirmationMessage = () => {
        return <span>You are going to <span className='action'>draw </span> <span className='coin'>{new Coin(this.state.draw, this.props.principalDenom).convertToString()}</span> from CDP  for address <b>{this.state.user} </b>
     with <Fee gas={this.state.gasEstimate} />.</span>
    }

    getPath = () => {
        let meta = TypeMeta[this.state.actionType];
        return `${meta.pathPreFix}/${this.state.user}/${this.props.collateral}/${meta.pathSuffix}`
    }



    render = () => {
        return <span className="ledger-buttons-group px-2">
            <Button color="danger" size="sm" onClick={() => this.openModal(Types.DRAWDEBT, {})}> {TypeMeta[Types.DRAWDEBT].button} </Button>
            {this.renderModal()}
        </span>;
    }
}

class RepayDebtCDPButton extends LedgerButton {

    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            debt: 0,
            collateral: 0,
            collateralDenom: props.collateral,
            maxAmount: props.principalDeposited / Meteor.settings.public.coins[5].fraction,
            ratio: ((parseInt(props.collateralDeposited) / Meteor.settings.public.coins[1].fraction) * parseFloat(props.price)) / (parseInt(props.principalDeposited) / Meteor.settings.public.coins[5].fraction),
            usdxTotalValue: props.usdxTotalValue / Meteor.settings.public.coins[5].fraction,
        }
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        let maxAmount = nextProps.principalDeposited / Meteor.settings.public.coins[5].fraction;
        let ratio = ((parseInt(nextProps.collateralDeposited) / Meteor.settings.public.coins[1].fraction) * parseFloat(nextProps.price)) / (parseInt(nextProps.principalDeposited) / Meteor.settings.public.coins[5].fraction);
        let usdxTotalValue = nextProps.usdxTotalValue / Meteor.settings.public.coins[5].fraction;
        if (!_.isEqual(maxAmount, prevState.maxAmount)) {
            return {
                maxAmount: maxAmount,
                ratio: ratio,
                usdxTotalValue: usdxTotalValue
            }
        }
        else return null;
    }

    handleChange = (e) => {
        const { target } = e;
        const value = target.value;
        const { name } = target;
        this.setState({
            [name]: value,
        }, () => {
            this.setState({
                ratio: (((parseInt(this.props.collateralDeposited) / Meteor.settings.public.coins[1].fraction) * parseFloat(this.props.price)) / ((parseInt(this.props.principalDeposited) / Meteor.settings.public.coins[5].fraction) - parseFloat(this.state.collateral))),
            })
        });
    }


    renderActionTab = () => {
        if (!this.state.currentUser) return null;
        return <TabPane tabId="2" className="modal-body">
            <h3 className="text-center pb-5">Repay <img src="/img/usdx-symbol.svg" className="symbol-img mb-1" /> USDX Debt </h3>
            <FormGroup>
                <Label for="repay" className="mb-n4"><T>cdp.repay</T></Label>
                <FormText className="coin-available mb-n5 float-right">Current Debt {new Coin(this.state.maxAmount, this.props.principalDenom).convertToString()}</FormText>
                <InputGroup className="modal-create-cdp py-n5">
                    <InputGroupAddon addonType="prepend">
                        <InputGroupText className="modal-create-cdp"><img src="/img/usdx-symbol.svg" className="symbol-img" /> </InputGroupText>
                    </InputGroupAddon>

                    <Input placeholder="Repay Amount" name="debt" value={this.state.debt} type="number" onChange={this.handleChange}
                        min={Coin.MinStake} max={this.state.maxAmount}
                        invalid={this.state.debt != null && !isBetween(this.state.debt, 0, this.state.usdxTotalValue)} className="modal-create-cdp " />
                    <InputGroupAddon addonType="append">
                        <InputGroupText className="modal-create-cdp font-weight-bold">USDX</InputGroupText>
                    </InputGroupAddon>
                </InputGroup>
            </FormGroup>

            <FormGroup>
                <InputGroup >
                    <InputGroupAddon addonType="prepend">
                        <Label for="collateral" className="mt-3"><T>cdp.collateralizationRatio</T></Label>
                    </InputGroupAddon>
                    <Input invalid={!((this.state.ratio !== Infinity) && (this.state.ratio > this.props.collateralizationRatio))}
                        className={((this.state.ratio !== Infinity) && (this.state.ratio > this.props.collateralizationRatio)) ? 'modal-create-cdp text-success text-right mt-2' : 'modal-create-cdp text-danger text-right mt-2 pr-5'}
                        value={((this.state.ratio !== Infinity) && (this.state.ratio > this.props.collateralizationRatio)) ? numbro(this.state.ratio).format({ mantissa: 6 }) : numbro(this.state.ratio).format({ mantissa: 6 })}
                        disabled={true} />

                </InputGroup>
            </FormGroup>
            <FormGroup className="mb-n4" >
                <Label for="memo" className="mb-n4"><T>cdp.memo</T></Label>
                <Input name="memo" onChange={this.handleInputChange} className="mb-n4"
                    placeholder="Memo(optional)" type="textarea" value={this.state.memo} />
            </FormGroup>
        </TabPane>
    }

    supportAction(action) {
        return action === Types.REPAYDEBT;
    }

    isDataValid = () => {
        if (!this.state.currentUser) return false
        return isBetween(this.state.debt, 0.000001, this.state.maxAmount)
    }

    getConfirmationMessage = () => {
        return <span>You are going to <span className='action'>repay </span> <span className='coin'>{new Coin(this.state.debt, this.props.principalDenom).convertToString(8)}</span> to CDP for address <b>{this.state.user} </b>
     with <Fee gas={this.state.gasEstimate} />.</span>
    }

    getPath = () => {
        let meta = TypeMeta[this.state.actionType];
        return `${meta.pathPreFix}/${this.state.user}/${this.props.collateral}/${meta.pathSuffix}`
    }

    render = () => {
        return <span className="ledger-buttons-group px-2">
            <Button disabled={this.props.disabled} color="info" size="sm" onClick={() => this.openModal(Types.REPAYDEBT, {})}> {TypeMeta[Types.REPAYDEBT].button} </Button>
            {this.renderModal()}
        </span>;
    }
}

class WithdrawIncentiveRewards extends LedgerButton {

    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            denom: props.denom,
            incentiveRewards: 0,
        }
    }

    renderActionTab = () => {
        if (!this.state.currentUser) return null;
        return <TabPane tabId="2" className="modal-body">
            <h3>Withdraw all incentive rewards from CDP</h3>
            {this.props.rewards ? <div>Your current rewards amount is: <CoinAmount amount={this.props.rewards} /></div> : ''}

        </TabPane>

    }

    supportAction(action) {
        return action === Types.CLAIMINCENTIVEREWARDS
    }


    getConfirmationMessage = () => {
        return <span>You are going to <span className='action'>claim</span> incentive rewards from CDP for address <b>{this.state.user} </b>
     with <Fee gas={this.state.gasEstimate} />.</span>
    }

    getPath = () => {
        let meta = TypeMeta[this.state.actionType];
        return `${meta.pathPreFix}/${meta.pathSuffix}`
    }


    render = () => {
        return <span className="ledger-buttons-group px-2">
            <Button color="success" size="sm" disabled={!this.props.rewards} onClick={() => this.openModal(Types.CLAIMINCENTIVEREWARDS, {})}> {TypeMeta[Types.CLAIMINCENTIVEREWARDS].button} </Button>
            {this.renderModal()}
        </span>;
    }
}

class AuctionBidButton extends LedgerButton {

    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            bid: 0,
            denom: props.denom,
            auctionID: props.auctionID,
            minAmount: parseFloat(props.currentBidAmount) / (Meteor.settings.public.coins[5].fraction) * 1.01,
            maxAmount: parseFloat(props.maxBid) / (Meteor.settings.public.coins[5].fraction)
        }
    }

    handleChange = (e) => {
        const { target } = e;
        const value = target.value;
        const { name } = target;
        this.setState({
            [name]: value,
        })
    }

    renderActionTab = () => {
        if (!this.state.currentUser) return null;
        return <TabPane tabId="2" className="modal-body">
            <h3>Place Bid on Auction {this.state.auctionID} </h3>
            <FormGroup>
                <Label for="bid"><T>auction.bidAmount</T></Label>
                <Input placeholder="Bid Amount" name="bid" value={this.state.bid} type="number" onChange={this.handleChange}
                    min={this.state.minAmount} max={this.state.maxAmount}
                    invalid={this.state.bid != null && !isBetween(this.state.minAmount, 0, this.state.maxAmount)} />
                <FormText>The amount of USDX you would like to bid</FormText>
                <FormFeedback>The bid value must be between {new Coin(this.state.minAmount, this.state.denom).convertToString(4)} and {new Coin(this.state.maxAmount, this.state.denom).convertToString(4)}</FormFeedback>
            </FormGroup>
            <FormGroup>
                <Label for="memo"><T>cdp.memo</T></Label>
                <Input name="memo" onChange={this.handleInputChange}
                    placeholder="Memo(optional)" type="textarea" value={this.state.memo} />
            </FormGroup>
        </TabPane>

    }

    supportAction(action) {
        return action === Types.AUCTIONBID
    }


    getConfirmationMessage = () => {
        return <span>You are going to <span className='action'>place </span> a <span className='coin'>{new Coin(this.state.bid, this.state.denom).convertToString(4)}</span>  bid on auction with ID  <b>{this.state.auctionID} </b>
     with <Fee gas={this.state.gasEstimate} />.</span>
    }

    getPath = () => {
        let meta = TypeMeta[this.state.actionType];

        return `auction/${meta.pathPreFix}/${this.state.auctionID}/${meta.pathSuffix}`
    }


    render = () => {
        return <span className="ledger-buttons-group px-2">
            <Button color="danger" size="sm" onClick={() => this.openModal(Types.AUCTIONBID, {})}> {TypeMeta[Types.AUCTIONBID].button} </Button>
            {this.renderModal()}
        </span>;
    }
}



export {
    DelegationButtons,
    WithdrawButton,
    TransferButton,
    SubmitProposalButton,
    ProposalActionButtons,
    ClaimSwapButton,
    CreateCDPButton,
    DepositCDPButton,
    WithdrawCDPButton,
    DrawDebtCDPButton,
    RepayDebtCDPButton,
    WithdrawIncentiveRewards,
    AuctionBidButton
}
