//  ---------------------------------------------------------------------------

import poloniexRest from '../poloniex.js';
import { BadRequest, AuthenticationError, ExchangeError, ArgumentsRequired } from '../base/errors.js';
import { ArrayCache, ArrayCacheByTimestamp, ArrayCacheBySymbolById } from '../base/ws/Cache.js';
import { Int, OHLCV, OrderSide, OrderType, Str, Strings } from '../base/types.js';
import { Precise } from '../base/Precise.js';
import { sha256 } from '../static_dependencies/noble-hashes/sha256.js';
import Client from '../base/ws/Client.js';

//  ---------------------------------------------------------------------------

export default class poloniex extends poloniexRest {
    describe () {
        return this.deepExtend (super.describe (), {
            'has': {
                'ws': true,
                'watchOHLCV': true,
                'watchOrderBook': true,
                'watchTicker': true,
                'watchTickers': true,
                'watchTrades': true,
                'watchBalance': true,
                'watchStatus': false,
                'watchOrders': true,
                'watchMyTrades': true,
                'createOrderWs': true,
                'editOrderWs': false,
                'fetchOpenOrdersWs': false,
                'fetchOrderWs': false,
                'cancelOrderWs': true,
                'cancelOrdersWs': true,
                'cancelAllOrdersWs': true,
                'fetchTradesWs': false,
                'fetchBalanceWs': false,
            },
            'urls': {
                'api': {
                    'ws': {
                        'public': 'wss://ws.poloniex.com/ws/public',
                        'private': 'wss://ws.poloniex.com/ws/private',
                    },
                },
            },
            'options': {
                'createMarketBuyOrderRequiresPrice': true,
                'tradesLimit': 1000,
                'ordersLimit': 1000,
                'OHLCVLimit': 1000,
                'watchOrderBook': {
                    'name': 'book_lv2', // can also be 'book'
                },
                'connectionsLimit': 2000, // 2000 public, 2000 private, 4000 total, only for subscribe events, unsubscribe not restricted
                'requestsLimit': 500, // per second, only for subscribe events, unsubscribe not restricted
                'timeframes': {
                    '1m': 'candles_minute_1',
                    '5m': 'candles_minute_5',
                    '10m': 'candles_minute_10',
                    '15m': 'candles_minute_15',
                    '30m': 'candles_minute_30',
                    '1h': 'candles_hour_1',
                    '2h': 'candles_hour_2',
                    '4h': 'candles_hour_4',
                    '6h': 'candles_hour_6',
                    '12h': 'candles_hour_12',
                    '1d': 'candles_day_1',
                    '3d': 'candles_day_3',
                    '1w': 'candles_week_1',
                    '1M': 'candles_month_1',
                },
            },
            'streaming': {
                'keepAlive': 15000,
                'ping': this.ping,
            },
        });
    }

    async authenticate (params = {}) {
        /**
         * @ignore
         * @method
         * @description authenticates the user to access private web socket channels
         * @see https://docs.poloniex.com/#authenticated-channels-market-data-authentication
         * @returns {object} response from exchange
         */
        this.checkRequiredCredentials ();
        const timestamp = this.numberToString (this.milliseconds ());
        const url = this.urls['api']['ws']['private'];
        const messageHash = 'authenticated';
        const client = this.client (url);
        let future = this.safeValue (client.subscriptions, messageHash);
        if (future === undefined) {
            const accessPath = '/ws';
            const requestString = 'GET\n' + accessPath + '\nsignTimestamp=' + timestamp;
            const signature = this.hmac (this.encode (requestString), this.encode (this.secret), sha256, 'base64');
            const request = {
                'event': 'subscribe',
                'channel': [ 'auth' ],
                'params': {
                    'key': this.apiKey,
                    'signTimestamp': timestamp,
                    'signature': signature,
                    'signatureMethod': 'HmacSHA256',  // optional
                    'signatureVersion': '2',          // optional
                },
            };
            const message = this.extend (request, params);
            future = await this.watch (url, messageHash, message);
            //
            //    {
            //        "data": {
            //            "success": true,
            //            "ts": 1645597033915
            //        },
            //        "channel": "auth"
            //    }
            //
            //    # Failure to return results
            //
            //    {
            //        "data": {
            //            "success": false,
            //            "message": "Authentication failed!",
            //            "ts": 1646276295075
            //        },
            //        "channel": "auth"
            //    }
            //
            client.subscriptions[messageHash] = future;
        }
        return future;
    }

    async subscribe (name: string, messageHash: string, isPrivate: boolean, symbols: Strings = undefined, params = {}) {
        /**
         * @ignore
         * @method
         * @description Connects to a websocket channel
         * @param {string} name name of the channel
         * @param {boolean} isPrivate true for the authenticated url, false for the public url
         * @param {string[]|undefined} symbols CCXT market symbols
         * @param {object} [params] extra parameters specific to the poloniex api
         * @returns {object} data from the websocket stream
         */
        const publicOrPrivate = isPrivate ? 'private' : 'public';
        const url = this.urls['api']['ws'][publicOrPrivate];
        const subscribe = {
            'event': 'subscribe',
            'channel': [
                name,
            ],
        };
        let marketIds = [ ];
        if (this.isEmpty (symbols)) {
            marketIds.push ('all');
        } else {
            messageHash = messageHash + '::' + symbols.join (',');
            marketIds = this.marketIds (symbols);
        }
        if (name !== 'balances') {
            subscribe['symbols'] = marketIds;
        }
        const request = this.extend (subscribe, params);
        return await this.watch (url, messageHash, request, messageHash);
    }

    async tradeRequest (name: string, params = {}) {
        /**
         * @ignore
         * @method
         * @description Connects to a websocket channel
         * @param {string} name name of the channel
         * @param {string[]|undefined} symbols CCXT market symbols
         * @param {object} [params] extra parameters specific to the poloniex api
         * @returns {object} data from the websocket stream
         */
        const url = this.urls['api']['ws']['private'];
        const messageHash = this.nonce ();
        const subscribe = {
            'id': messageHash,
            'event': name,
            'params': params,
        };
        return await this.watch (url, messageHash, subscribe, messageHash);
    }

    async createOrderWs (symbol: string, type: OrderType, side: OrderSide, amount: number, price: number = undefined, params = {}) {
        /**
         * @method
         * @name poloniex#createOrderWs
         * @see https://docs.poloniex.com/#authenticated-channels-trade-requests-create-order
         * @description create a trade order
         * @param {string} symbol unified symbol of the market to create an order in
         * @param {string} type 'market' or 'limit'
         * @param {string} side 'buy' or 'sell'
         * @param {float} amount how much of currency you want to trade in units of base currency
         * @param {float} [price] the price at which the order is to be fullfilled, in units of the quote currency, ignored in market orders
         * @param {object} [params] extra parameters specific to the poloniex api endpoint
         * @param {string} [params.timeInForce] GTC (default), IOC, FOK
         * @param {string} [params.clientOrderId] Maximum 64-character length.*
         *
         * EXCHANGE SPECIFIC PARAMETERS
         * @param {string} [params.amount] quote units for the order
         * @param {boolean} [params.allowBorrow] allow order to be placed by borrowing funds (Default: false)
         * @param {string} [params.stpMode] self-trade prevention, defaults to expire_taker, none: enable self-trade; expire_taker: taker order will be canceled when self-trade happens
         * @param {string} [params.slippageTolerance] used to control the maximum slippage ratio, the value range is greater than 0 and less than 1
         * @returns {object} an [order structure]{@link https://github.com/ccxt/ccxt/wiki/Manual#order-structure}
         */
        await this.loadMarkets ();
        await this.authenticate ();
        const market = this.market (symbol);
        let uppercaseType = type.toUpperCase ();
        const uppercaseSide = side.toUpperCase ();
        const isPostOnly = this.isPostOnly (uppercaseType === 'MARKET', uppercaseType === 'LIMIT_MAKER', params);
        if (isPostOnly) {
            uppercaseType = 'LIMIT_MAKER';
        }
        const request = {
            'symbol': market['id'],
            'side': side.toUpperCase (),
            'type': type.toUpperCase (),
        };
        if ((uppercaseType === 'MARKET') && (uppercaseSide === 'BUY')) {
            let quoteAmount = this.safeString (params, 'amount');
            if ((quoteAmount === undefined) && (this.options['createMarketBuyOrderRequiresPrice'])) {
                const cost = this.safeNumber (params, 'cost');
                params = this.omit (params, 'cost');
                if (price === undefined && cost === undefined) {
                    throw new ArgumentsRequired (this.id + ' createOrder() requires the price argument with market buy orders to calculate total order cost (amount to spend), where cost = amount * price. Supply a price argument to createOrder() call if you want the cost to be calculated for you from price and amount, or, alternatively, add .options["createMarketBuyOrderRequiresPrice"] = false to supply the cost in the amount argument (the exchange-specific behaviour)');
                } else {
                    const amountString = this.numberToString (amount);
                    const priceString = this.numberToString (price);
                    const quote = Precise.stringMul (amountString, priceString);
                    amount = (cost !== undefined) ? cost : this.parseNumber (quote);
                    quoteAmount = this.costToPrecision (symbol, amount);
                }
            } else {
                quoteAmount = this.costToPrecision (symbol, amount);
            }
            request['amount'] = this.amountToPrecision (market['symbol'], quoteAmount);
        } else {
            request['quantity'] = this.amountToPrecision (market['symbol'], amount);
            if (price !== undefined) {
                request['price'] = this.priceToPrecision (symbol, price);
            }
        }
        return await this.tradeRequest ('createOrder', this.extend (request, params));
    }

    async cancelOrderWs (id: string, symbol: string = undefined, params = {}) {
        /**
         * @method
         * @name poloniex#cancelOrderWs
         * @see https://docs.poloniex.com/#authenticated-channels-trade-requests-cancel-multiple-orders
         * @description cancel multiple orders
         * @param {string} id order id
         * @param {string} [symbol] unified market symbol
         * @param {object} [params] extra parameters specific to the poloniex api endpoint
         * @param {string} [params.clientOrderId] client order id
         * @returns {object} an list of [order structures]{@link https://github.com/ccxt/ccxt/wiki/Manual#order-structure}
         */
        const clientOrderId = this.safeString (params, 'clientOrderId');
        if (clientOrderId !== undefined) {
            const clientOrderIds = this.safeValue (params, 'clientOrderId', []);
            params['clientOrderIds'] = this.arrayConcat (clientOrderIds, [ clientOrderId ]);
        }
        return await this.cancelOrdersWs ([ id ], symbol, params);
    }

    async cancelOrdersWs (ids: string[], symbol: string = undefined, params = {}) {
        /**
         * @method
         * @name poloniex#cancelOrdersWs
         * @see https://docs.poloniex.com/#authenticated-channels-trade-requests-cancel-multiple-orders
         * @description cancel multiple orders
         * @param {string[]} ids order ids
         * @param {string} symbol unified market symbol, default is undefined
         * @param {object} [params] extra parameters specific to the poloniex api endpoint
         * @param {string[]} [params.clientOrderIds] client order ids
         * @returns {object} an list of [order structures]{@link https://github.com/ccxt/ccxt/wiki/Manual#order-structure}
         */
        await this.loadMarkets ();
        await this.authenticate ();
        const request = {
            'orderIds': ids,
        };
        return await this.tradeRequest ('cancelOrders', this.extend (request, params));
    }

    async cancelAllOrdersWs (symbol: string = undefined, params = {}) {
        /**
         * @method
         * @name poloniex#cancelAllOrdersWs
         * @see https://docs.poloniex.com/#authenticated-channels-trade-requests-cancel-all-orders
         * @description cancel all open orders of a type. Only applicable to Option in Portfolio Margin mode, and MMP privilege is required.
         * @param {string} symbol unified market symbol, only orders in the market of this symbol are cancelled when symbol is not undefined
         * @param {object} [params] extra parameters specific to the poloniex api endpoint
         * @returns {object[]} a list of [order structures]{@link https://github.com/ccxt/ccxt/wiki/Manual#order-structure}
         */
        await this.loadMarkets ();
        await this.authenticate ();
        return await this.tradeRequest ('cancelAllOrders', params);
    }

    handleOrderRequest (client: Client, message) {
        //
        //    {
        //        "id": "1234567",
        //        "data": [{
        //           "orderId": 205343650954092544,
        //           "clientOrderId": "",
        //           "message": "",
        //           "code": 200
        //        }]
        //    }
        //
        const messageHash = this.safeInteger (message, 'id');
        const data = this.safeValue (message, 'data', []);
        const orders = [];
        for (let i = 0; i < data.length; i++) {
            const order = data[i];
            const parsedOrder = this.parseWsOrder (order);
            orders.push (parsedOrder);
        }
        client.resolve (orders, messageHash);
    }

    async watchOHLCV (symbol: string, timeframe = '1m', since: Int = undefined, limit: Int = undefined, params = {}) {
        /**
         * @method
         * @name poloniex#watchOHLCV
         * @description watches historical candlestick data containing the open, high, low, and close price, and the volume of a market
         * @see https://docs.poloniex.com/#public-channels-market-data-candlesticks
         * @param {string} symbol unified symbol of the market to fetch OHLCV data for
         * @param {string} timeframe the length of time each candle represents
         * @param {int} [since] timestamp in ms of the earliest candle to fetch
         * @param {int} [limit] the maximum amount of candles to fetch
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {int[][]} A list of candles ordered as timestamp, open, high, low, close, volume
         */
        await this.loadMarkets ();
        const timeframes = this.safeValue (this.options, 'timeframes', {});
        const channel = this.safeString (timeframes, timeframe, timeframe);
        if (channel === undefined) {
            throw new BadRequest (this.id + ' watchOHLCV cannot take a timeframe of ' + timeframe);
        }
        const ohlcv = await this.subscribe (channel, channel, false, [ symbol ], params);
        if (this.newUpdates) {
            limit = ohlcv.getLimit (symbol, limit);
        }
        return this.filterBySinceLimit (ohlcv, since, limit, 0, true);
    }

    async watchTicker (symbol: string, params = {}) {
        /**
         * @method
         * @name poloniex#watchTicker
         * @description watches a price ticker, a statistical calculation with the information calculated over the past 24 hours for a specific market
         * @see https://docs.poloniex.com/#public-channels-market-data-ticker
         * @param {string} symbol unified symbol of the market to fetch the ticker for
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/#/?id=ticker-structure}
         */
        await this.loadMarkets ();
        symbol = this.symbol (symbol);
        const tickers = await this.watchTickers ([ symbol ], params);
        return this.safeValue (tickers, symbol);
    }

    async watchTickers (symbols = undefined, params = {}) {
        /**
         * @method
         * @name poloniex#watchTicker
         * @description watches a price ticker, a statistical calculation with the information calculated over the past 24 hours for a specific market
         * @see https://docs.poloniex.com/#public-channels-market-data-ticker
         * @param {string} symbol unified symbol of the market to fetch the ticker for
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/#/?id=ticker-structure}
         */
        await this.loadMarkets ();
        const name = 'ticker';
        symbols = this.marketSymbols (symbols);
        const newTickers = await this.subscribe (name, name, false, symbols, params);
        if (this.newUpdates) {
            return newTickers;
        }
        return this.filterByArray (this.tickers, 'symbol', symbols);
    }

    async watchTrades (symbol: string, since: Int = undefined, limit: Int = undefined, params = {}) {
        /**
         * @method
         * @name poloniex#watchTrades
         * @description get the list of most recent trades for a particular symbol
         * @see https://docs.poloniex.com/#public-channels-market-data-trades
         * @param {string} symbol unified symbol of the market to fetch trades for
         * @param {int} [since] timestamp in ms of the earliest trade to fetch
         * @param {int} [limit] the maximum amount of trades to fetch
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object[]} a list of [trade structures]{@link https://docs.ccxt.com/#/?id=public-trades}
         */
        await this.loadMarkets ();
        symbol = this.symbol (symbol);
        const name = 'trades';
        const trades = await this.subscribe (name, name, false, [ symbol ], params);
        if (this.newUpdates) {
            limit = trades.getLimit (symbol, limit);
        }
        return this.filterBySinceLimit (trades, since, limit, 'timestamp', true);
    }

    async watchOrderBook (symbol: string, limit: Int = undefined, params = {}) {
        /**
         * @method
         * @name poloniex#watchOrderBook
         * @description watches information on open orders with bid (buy) and ask (sell) prices, volumes and other data
         * @see https://docs.poloniex.com/#public-channels-market-data-book-level-2
         * @param {string} symbol unified symbol of the market to fetch the order book for
         * @param {int} [limit] not used by poloniex watchOrderBook
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object} A dictionary of [order book structures]{@link https://docs.ccxt.com/#/?id=order-book-structure} indexed by market symbols
         */
        await this.loadMarkets ();
        const watchOrderBookOptions = this.safeValue (this.options, 'watchOrderBook');
        let name = this.safeString (watchOrderBookOptions, 'name', 'book_lv2');
        [ name, params ] = this.handleOptionAndParams (params, 'method', 'name', name);
        const orderbook = await this.subscribe (name, name, false, [ symbol ], params);
        return orderbook.limit ();
    }

    async watchOrders (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}) {
        /**
         * @method
         * @name poloniex#watchOrders
         * @description watches information on multiple orders made by the user
         * @see https://docs.poloniex.com/#authenticated-channels-market-data-orders
         * @param {string} symbol unified market symbol of the market orders were made in
         * @param {int} [since] not used by poloniex watchOrders
         * @param {int} [limit] not used by poloniex watchOrders
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object[]} a list of [order structures]{@link https://docs.ccxt.com/#/?id=order-structure}
         */
        await this.loadMarkets ();
        const name = 'orders';
        await this.authenticate ();
        if (symbol !== undefined) {
            symbol = this.symbol (symbol);
        }
        const symbols = (symbol === undefined) ? undefined : [ symbol ];
        const orders = await this.subscribe (name, name, true, symbols, params);
        if (this.newUpdates) {
            limit = orders.getLimit (symbol, limit);
        }
        return this.filterBySinceLimit (orders, since, limit, 'timestamp', true);
    }

    async watchMyTrades (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}) {
        /**
         * @method
         * @name poloniex#watchMyTrades
         * @description watches information on multiple trades made by the user using orders stream
         * @see https://docs.poloniex.com/#authenticated-channels-market-data-orders
         * @param {string} symbol unified market symbol of the market orders were made in
         * @param {int} [since] not used by poloniex watchMyTrades
         * @param {int} [limit] not used by poloniex watchMyTrades
         * @param {object} [params] extra parameters specific to the poloniex strean
         * @returns {object[]} a list of [trade structures]{@link https://docs.ccxt.com/#/?id=trade-structure}
         */
        await this.loadMarkets ();
        const name = 'orders';
        const messageHash = 'myTrades';
        await this.authenticate ();
        if (symbol !== undefined) {
            symbol = this.symbol (symbol);
        }
        const symbols = (symbol === undefined) ? undefined : [ symbol ];
        const trades = await this.subscribe (name, messageHash, true, symbols, params);
        if (this.newUpdates) {
            limit = trades.getLimit (symbol, limit);
        }
        return this.filterBySinceLimit (trades, since, limit, 'timestamp', true);
    }

    async watchBalance (params = {}) {
        /**
         * @method
         * @name poloniex#watchBalance
         * @description watch balance and get the amount of funds available for trading or funds locked in orders
         * @see https://docs.poloniex.com/#authenticated-channels-market-data-balances
         * @param {object} [params] extra parameters specific to the exchange API endpoint
         * @returns {object} a [balance structure]{@link https://docs.ccxt.com/#/?id=balance-structure}
         */
        await this.loadMarkets ();
        const name = 'balances';
        await this.authenticate ();
        return await this.subscribe (name, name, true, undefined, params);
    }

    parseWsOHLCV (ohlcv, market = undefined): OHLCV {
        //
        //    {
        //        "symbol": "BTC_USDT",
        //        "amount": "840.7240416",
        //        "high": "24832.35",
        //        "quantity": "0.033856",
        //        "tradeCount": 1,
        //        "low": "24832.35",
        //        "closeTime": 1676942519999,
        //        "startTime": 1676942460000,
        //        "close": "24832.35",
        //        "open": "24832.35",
        //        "ts": 1676942492072
        //    }
        //
        return [
            this.safeInteger (ohlcv, 'startTime'),
            this.safeNumber (ohlcv, 'open'),
            this.safeNumber (ohlcv, 'high'),
            this.safeNumber (ohlcv, 'low'),
            this.safeNumber (ohlcv, 'close'),
            this.safeNumber (ohlcv, 'quantity'),
        ];
    }

    handleOHLCV (client: Client, message) {
        //
        //    {
        //        "channel": "candles_minute_1",
        //        "data": [
        //            {
        //                "symbol": "BTC_USDT",
        //                "amount": "840.7240416",
        //                "high": "24832.35",
        //                "quantity": "0.033856",
        //                "tradeCount": 1,
        //                "low": "24832.35",
        //                "closeTime": 1676942519999,
        //                "startTime": 1676942460000,
        //                "close": "24832.35",
        //                "open": "24832.35",
        //                "ts": 1676942492072
        //            }
        //        ]
        //    }
        //
        let data = this.safeValue (message, 'data');
        data = this.safeValue (data, 0);
        const channel = this.safeString (message, 'channel');
        const marketId = this.safeString (data, 'symbol');
        const symbol = this.safeSymbol (marketId);
        const market = this.safeMarket (symbol);
        const timeframe = this.findTimeframe (channel);
        const messageHash = channel + '::' + symbol;
        const parsed = this.parseWsOHLCV (data, market);
        this.ohlcvs[symbol] = this.safeValue (this.ohlcvs, symbol, {});
        let stored = this.safeValue (this.ohlcvs[symbol], timeframe);
        if (symbol !== undefined) {
            if (stored === undefined) {
                const limit = this.safeInteger (this.options, 'OHLCVLimit', 1000);
                stored = new ArrayCacheByTimestamp (limit);
                this.ohlcvs[symbol][timeframe] = stored;
            }
            stored.append (parsed);
            client.resolve (stored, messageHash);
        }
        return message;
    }

    handleTrade (client: Client, message) {
        //
        //    {
        //        "channel": "trades",
        //        "data": [
        //            {
        //                "symbol": "BTC_USDT",
        //                "amount": "13.41634893",
        //                "quantity": "0.000537",
        //                "takerSide": "buy",
        //                "createTime": 1676950548834,
        //                "price": "24983.89",
        //                "id": "62486976",
        //                "ts": 1676950548839
        //            }
        //        ]
        //    }
        //
        const data = this.safeValue (message, 'data', []);
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const marketId = this.safeString (item, 'symbol');
            if (marketId !== undefined) {
                const trade = this.parseWsTrade (item);
                const symbol = trade['symbol'];
                const type = 'trades';
                const messageHash = type + '::' + symbol;
                let tradesArray = this.safeValue (this.trades, symbol);
                if (tradesArray === undefined) {
                    const tradesLimit = this.safeInteger (this.options, 'tradesLimit', 1000);
                    tradesArray = new ArrayCache (tradesLimit);
                    this.trades[symbol] = tradesArray;
                }
                tradesArray.append (trade);
                client.resolve (tradesArray, messageHash);
            }
        }
        return message;
    }

    parseWsTrade (trade, market = undefined) {
        //
        // handleTrade
        //
        //    {
        //        "symbol": "BTC_USDT",
        //        "amount": "13.41634893",
        //        "quantity": "0.000537",
        //        "takerSide": "buy",
        //        "createTime": 1676950548834,
        //        "price": "24983.89",
        //        "id": "62486976",
        //        "ts": 1676950548839
        //    }
        //
        // private trade
        //    {
        //        "orderId":"186250258089635840",
        //        "tradeId":"62036513",
        //        "clientOrderId":"",
        //        "accountType":"SPOT",
        //        "eventType":"trade",
        //        "symbol":"ADA_USDT",
        //        "side":"SELL",
        //        "type":"MARKET",
        //        "price":"0",
        //        "quantity":"3",
        //        "state":"FILLED",
        //        "createTime":1685371921891,
        //        "tradeTime":1685371921908,
        //        "tradePrice":"0.37694",
        //        "tradeQty":"3",
        //        "feeCurrency":"USDT",
        //        "tradeFee":"0.00226164",
        //        "tradeAmount":"1.13082",
        //        "filledQuantity":"3",
        //        "filledAmount":"1.13082",
        //        "ts":1685371921945,
        //        "source":"WEB",
        //        "orderAmount":"0",
        //        "matchRole":"TAKER"
        //     }
        //
        const marketId = this.safeString (trade, 'symbol');
        market = this.safeMarket (marketId, market);
        const timestamp = this.safeInteger (trade, 'createTime');
        const takerMaker = this.safeStringLower2 (trade, 'matchRole', 'taker');
        return this.safeTrade ({
            'info': trade,
            'id': this.safeString2 (trade, 'id', 'tradeId'),
            'symbol': this.safeString (market, 'symbol'),
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'order': this.safeString (trade, 'orderId'),
            'type': this.safeStringLower (trade, 'type'),
            'side': this.safeStringLower2 (trade, 'takerSide', 'side'),
            'takerOrMaker': takerMaker,
            'price': this.omitZero (this.safeNumber2 (trade, 'tradePrice', 'price')),
            'amount': this.omitZero (this.safeNumber2 (trade, 'filledQuantity', 'quantity')),
            'cost': this.safeString2 (trade, 'amount', 'filledAmount'),
            'fee': {
                'rate': undefined,
                'cost': this.safeString (trade, 'tradeFee'),
                'currency': this.safeString (trade, 'feeCurrency'),
            },
        }, market);
    }

    parseStatus (status) {
        const statuses = {
            'NEW': 'open',
            'PARTIALLY_FILLED': 'open',
            'FILLED': 'closed',
            'PENDING_CANCEL': 'open',
            'PARTIALLY_CANCELED': 'open',
            'CANCELED': 'canceled',
            // FAILED
        };
        return this.safeString (statuses, status, status);
    }

    parseWsOrderTrade (trade, market = undefined) {
        //
        //    {
        //        "symbol": "BTC_USDT",
        //        "type": "LIMIT",
        //        "quantity": "1",
        //        "orderId": "32471407854219264",
        //        "tradeFee": "0",
        //        "clientOrderId": "",
        //        "accountType": "SPOT",
        //        "feeCurrency": "",
        //        "eventType": "place",
        //        "source": "API",
        //        "side": "BUY",
        //        "filledQuantity": "0",
        //        "filledAmount": "0",
        //        "matchRole": "MAKER",
        //        "state": "NEW",
        //        "tradeTime": 0,
        //        "tradeAmount": "0",
        //        "orderAmount": "0",
        //        "createTime": 1648708186922,
        //        "price": "47112.1",
        //        "tradeQty": "0",
        //        "tradePrice": "0",
        //        "tradeId": "0",
        //        "ts": 1648708187469
        //    }
        //
        const timestamp = this.safeInteger (trade, 'tradeTime');
        const marketId = this.safeString (trade, 'symbol');
        return this.safeTrade ({
            'info': trade,
            'id': this.safeString (trade, 'tradeId'),
            'symbol': this.safeSymbol (marketId, market),
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'order': this.safeString (trade, 'orderId'),
            'type': this.safeStringLower (trade, 'type'),
            'side': this.safeString (trade, 'side'),
            'takerOrMaker': this.safeStringLower (trade, 'matchRole'),
            'price': this.safeString (trade, 'price'),
            'amount': this.safeString (trade, 'tradeAmount'),
            'cost': undefined,
            'fee': {
                'rate': undefined,
                'cost': this.safeString (trade, 'tradeFee'),
                'currency': this.safeString (trade, 'feeCurrency'),
            },
        }, market);
    }

    handleOrder (client: Client, message) {
        //
        // Order is created
        //
        //    {
        //        "channel": "orders",
        //        "data": [
        //            {
        //                "symbol": "BTC_USDT",
        //                "type": "LIMIT",
        //                "quantity": "1",
        //                "orderId": "32471407854219264",
        //                "tradeFee": "0",
        //                "clientOrderId": "",
        //                "accountType": "SPOT",
        //                "feeCurrency": "",
        //                "eventType": "place",
        //                "source": "API",
        //                "side": "BUY",
        //                "filledQuantity": "0",
        //                "filledAmount": "0",
        //                "matchRole": "MAKER",
        //                "state": "NEW",
        //                "tradeTime": 0,
        //                "tradeAmount": "0",
        //                "orderAmount": "0",
        //                "createTime": 1648708186922,
        //                "price": "47112.1",
        //                "tradeQty": "0",
        //                "tradePrice": "0",
        //                "tradeId": "0",
        //                "ts": 1648708187469
        //            }
        //        ]
        //    }
        //
        const data = this.safeValue (message, 'data', []);
        let orders = this.orders;
        if (orders === undefined) {
            const limit = this.safeInteger (this.options, 'ordersLimit');
            orders = new ArrayCacheBySymbolById (limit);
            this.orders = orders;
        }
        const marketIds = [];
        for (let i = 0; i < data.length; i++) {
            const order = this.safeValue (data, i);
            const marketId = this.safeString (order, 'symbol');
            const eventType = this.safeString (order, 'eventType');
            if (marketId !== undefined) {
                const symbol = this.safeSymbol (marketId);
                const orderId = this.safeString (order, 'orderId');
                const clientOrderId = this.safeString (order, 'clientOrderId');
                if (eventType === 'place' || eventType === 'canceled') {
                    const parsed = this.parseWsOrder (order);
                    orders.append (parsed);
                } else {
                    const previousOrders = this.safeValue (orders.hashmap, symbol, {});
                    const previousOrder = this.safeValue2 (previousOrders, orderId, clientOrderId);
                    const trade = this.parseWsTrade (order);
                    this.handleMyTrades (client, trade);
                    if (previousOrder['trades'] === undefined) {
                        previousOrder['trades'] = [];
                    }
                    previousOrder['trades'].push (trade);
                    previousOrder['lastTradeTimestamp'] = trade['timestamp'];
                    let totalCost = '0';
                    let totalAmount = '0';
                    const previousOrderTrades = previousOrder['trades'];
                    for (let j = 0; j < previousOrderTrades.length; j++) {
                        const previousOrderTrade = previousOrderTrades[j];
                        const cost = this.numberToString (previousOrderTrade['cost']);
                        const amount = this.numberToString (previousOrderTrade['amount']);
                        totalCost = Precise.stringAdd (totalCost, cost);
                        totalAmount = Precise.stringAdd (totalAmount, amount);
                    }
                    if (Precise.stringGt (totalAmount, '0')) {
                        previousOrder['average'] = this.parseNumber (Precise.stringDiv (totalCost, totalAmount));
                    }
                    previousOrder['cost'] = this.parseNumber (totalCost);
                    if (previousOrder['filled'] !== undefined) {
                        const tradeAmount = this.numberToString (trade['amount']);
                        let previousOrderFilled = this.numberToString (previousOrder['filled']);
                        previousOrderFilled = Precise.stringAdd (previousOrderFilled, tradeAmount);
                        previousOrder['filled'] = previousOrderFilled;
                        if (previousOrder['amount'] !== undefined) {
                            const previousOrderAmount = this.numberToString (previousOrder['amount']);
                            previousOrder['remaining'] = this.parseNumber (Precise.stringSub (previousOrderAmount, previousOrderFilled));
                        }
                    }
                    if (previousOrder['fee'] === undefined) {
                        previousOrder['fee'] = {
                            'rate': undefined,
                            'cost': 0,
                            'currency': trade['fee']['currency'],
                        };
                    }
                    if ((previousOrder['fee']['cost'] !== undefined) && (trade['fee']['cost'] !== undefined)) {
                        const stringOrderCost = this.numberToString (previousOrder['fee']['cost']);
                        const stringTradeCost = this.numberToString (trade['fee']['cost']);
                        previousOrder['fee']['cost'] = Precise.stringAdd (stringOrderCost, stringTradeCost);
                    }
                    const rawState = this.safeString (order, 'state');
                    const state = this.parseStatus (rawState);
                    previousOrder['status'] = state;
                    // update the newUpdates count
                    orders.append (previousOrder);
                }
                marketIds.push (marketId);
            }
        }
        for (let i = 0; i < marketIds.length; i++) {
            const marketId = marketIds[i];
            const market = this.market (marketId);
            const symbol = market['symbol'];
            const messageHash = 'orders::' + symbol;
            client.resolve (orders, messageHash);
        }
        client.resolve (orders, 'orders');
        return message;
    }

    parseWsOrder (order, market = undefined) {
        //
        //    {
        //        "symbol": "BTC_USDT",
        //        "type": "LIMIT",
        //        "quantity": "1",
        //        "orderId": "32471407854219264",
        //        "tradeFee": "0",
        //        "clientOrderId": "",
        //        "accountType": "SPOT",
        //        "feeCurrency": "",
        //        "eventType": "place",
        //        "source": "API",
        //        "side": "BUY",
        //        "filledQuantity": "0",
        //        "filledAmount": "0",
        //        "matchRole": "MAKER",
        //        "state": "NEW",
        //        "tradeTime": 0,
        //        "tradeAmount": "0",
        //        "orderAmount": "0",
        //        "createTime": 1648708186922,
        //        "price": "47112.1",
        //        "tradeQty": "0",
        //        "tradePrice": "0",
        //        "tradeId": "0",
        //        "ts": 1648708187469
        //    }
        //
        const id = this.safeString (order, 'orderId');
        const clientOrderId = this.safeString (order, 'clientOrderId');
        const marketId = this.safeString (order, 'symbol');
        const timestamp = this.safeString (order, 'ts');
        const filledAmount = this.safeString (order, 'filledAmount');
        const status = this.safeString (order, 'state');
        let trades = undefined;
        if (!Precise.stringEq (filledAmount, '0')) {
            trades = [];
            const trade = this.parseWsOrderTrade (order);
            trades.push (trade);
        }
        return this.safeOrder ({
            'info': order,
            'symbol': this.safeSymbol (marketId, market),
            'id': id,
            'clientOrderId': clientOrderId,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'lastTradeTimestamp': undefined,
            'type': this.safeString (order, 'type'),
            'timeInForce': undefined,
            'postOnly': undefined,
            'side': this.safeString (order, 'side'),
            'price': this.safeString (order, 'price'),
            'stopPrice': undefined,
            'triggerPrice': undefined,
            'amount': this.safeString (order, 'quantity'),
            'cost': undefined,
            'average': undefined,
            'filled': filledAmount,
            'remaining': this.safeString (order, 'remaining_size'),
            'status': this.parseStatus (status),
            'fee': {
                'rate': undefined,
                'cost': this.safeString (order, 'tradeFee'),
                'currency': this.safeString (order, 'feeCurrency'),
            },
            'trades': trades,
        });
    }

    handleTicker (client: Client, message) {
        //
        //    {
        //        "channel": "ticker",
        //        "data": [
        //            {
        //                "symbol": "BTC_USDT",
        //                "startTime": 1677280800000,
        //                "open": "23154.32",
        //                "high": "23212.21",
        //                "low": "22761.01",
        //                "close": "23148.86",
        //                "quantity": "105.179566",
        //                "amount": "2423161.17436702",
        //                "tradeCount": 17582,
        //                "dailyChange": "-0.0002",
        //                "markPrice": "23151.09",
        //                "closeTime": 1677367197924,
        //                "ts": 1677367251090
        //            }
        //        ]
        //    }
        //
        const data = this.safeValue (message, 'data', []);
        const newTickers = [];
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const marketId = this.safeString (item, 'symbol');
            if (marketId !== undefined) {
                const ticker = this.parseTicker (item);
                const symbol = ticker['symbol'];
                this.tickers[symbol] = ticker;
                newTickers.push (ticker);
            }
        }
        const messageHashes = this.findMessageHashes (client, 'ticker::');
        for (let i = 0; i < messageHashes.length; i++) {
            const messageHash = messageHashes[i];
            const parts = messageHash.split ('::');
            const symbolsString = parts[1];
            const symbols = symbolsString.split (',');
            const tickers = this.filterByArray (newTickers, 'symbol', symbols);
            if (!this.isEmpty (tickers)) {
                client.resolve (tickers, messageHash);
            }
        }
        client.resolve (newTickers, 'ticker');
        return message;
    }

    handleOrderBook (client: Client, message) {
        //
        // snapshot
        //
        //    {
        //        "channel": "book_lv2",
        //        "data": [
        //            {
        //                "symbol": "BTC_USDT",
        //                "createTime": 1677368876253,
        //                "asks": [
        //                    ["5.65", "0.02"],
        //                    ...
        //                ],
        //                "bids": [
        //                    ["6.16", "0.6"],
        //                    ...
        //                ],
        //                "lastId": 164148724,
        //                "id": 164148725,
        //                "ts": 1677368876316
        //            }
        //        ],
        //        "action": "snapshot"
        //    }
        //
        // update
        //
        //    {
        //        "channel": "book_lv2",
        //        "data": [
        //            {
        //                "symbol": "BTC_USDT",
        //                "createTime": 1677368876882,
        //                "asks": [
        //                    ["6.35", "3"]
        //                ],
        //                "bids": [
        //                    ["5.65", "0.02"]
        //                ],
        //                "lastId": 164148725,
        //                "id": 164148726,
        //                "ts": 1677368876890
        //            }
        //        ],
        //        "action": "update"
        //    }
        //
        const data = this.safeValue (message, 'data', []);
        const type = this.safeString (message, 'action');
        const snapshot = type === 'snapshot';
        const update = type === 'update';
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const marketId = this.safeString (item, 'symbol');
            const market = this.safeMarket (marketId);
            const symbol = market['symbol'];
            const name = 'book_lv2';
            const messageHash = name + '::' + symbol;
            const subscription = this.safeValue (client.subscriptions, messageHash, {});
            const limit = this.safeInteger (subscription, 'limit');
            const timestamp = this.safeInteger (item, 'ts');
            const asks = this.safeValue (item, 'asks');
            const bids = this.safeValue (item, 'bids');
            if (snapshot || update) {
                if (snapshot) {
                    this.orderbooks[symbol] = this.orderBook ({}, limit);
                }
                const orderbook = this.orderbooks[symbol];
                if (bids !== undefined) {
                    for (let j = 0; j < bids.length; j++) {
                        const bid = this.safeValue (bids, j);
                        const price = this.safeNumber (bid, 0);
                        const amount = this.safeNumber (bid, 1);
                        orderbook['bids'].store (price, amount);
                    }
                }
                if (asks !== undefined) {
                    for (let j = 0; j < asks.length; j++) {
                        const ask = this.safeValue (asks, j);
                        const price = this.safeNumber (ask, 0);
                        const amount = this.safeNumber (ask, 1);
                        orderbook['asks'].store (price, amount);
                    }
                }
                orderbook['symbol'] = symbol;
                orderbook['timestamp'] = timestamp;
                orderbook['datetime'] = this.iso8601 (timestamp);
                client.resolve (orderbook, messageHash);
            }
        }
    }

    handleBalance (client: Client, message) {
        //
        //    {
        //       "channel": "balances",
        //       "data": [
        //            {
        //                "changeTime": 1657312008411,
        //                "accountId": "1234",
        //                "accountType": "SPOT",
        //                "eventType": "place_order",
        //                "available": "9999999983.668",
        //                "currency": "BTC",
        //                "id": 60018450912695040,
        //                "userId": 12345,
        //                "hold": "16.332",
        //                "ts": 1657312008443
        //            }
        //        ]
        //    }
        //
        const data = this.safeValue (message, 'data', []);
        const messageHash = 'balances';
        this.balance = this.parseWsBalance (data);
        client.resolve (this.balance, messageHash);
    }

    parseWsBalance (response) {
        //
        //    [
        //        {
        //            "changeTime": 1657312008411,
        //            "accountId": "1234",
        //            "accountType": "SPOT",
        //            "eventType": "place_order",
        //            "available": "9999999983.668",
        //            "currency": "BTC",
        //            "id": 60018450912695040,
        //            "userId": 12345,
        //            "hold": "16.332",
        //            "ts": 1657312008443
        //        }
        //    ]
        //
        const firstBalance = this.safeValue (response, 0, {});
        const timestamp = this.safeInteger (firstBalance, 'ts');
        const result = {
            'info': response,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
        };
        for (let i = 0; i < response.length; i++) {
            const balance = this.safeValue (response, i);
            const currencyId = this.safeString (balance, 'currency');
            const code = this.safeCurrencyCode (currencyId);
            const newAccount = this.account ();
            newAccount['free'] = this.safeString (balance, 'available');
            newAccount['used'] = this.safeString (balance, 'hold');
            result[code] = newAccount;
        }
        return this.safeBalance (result);
    }

    handleMyTrades (client: Client, parsedTrade) {
        // emulated using the orders' stream
        const messageHash = 'myTrades';
        const symbol = parsedTrade['symbol'];
        if (this.myTrades === undefined) {
            const limit = this.safeInteger (this.options, 'tradesLimit', 1000);
            this.myTrades = new ArrayCacheBySymbolById (limit);
        }
        const trades = this.myTrades;
        trades.append (parsedTrade);
        client.resolve (trades, messageHash);
        const symbolMessageHash = messageHash + ':' + symbol;
        client.resolve (trades, symbolMessageHash);
    }

    handlePong (client: Client) {
        client.lastPong = this.milliseconds ();
    }

    handleMessage (client: Client, message) {
        if (this.handleErrorMessage (client, message)) {
            return;
        }
        const type = this.safeString (message, 'channel');
        const event = this.safeString (message, 'event');
        if (event === 'pong') {
            client.lastPong = this.milliseconds ();
        }
        const methods = {
            'candles_minute_1': this.handleOHLCV,
            'candles_minute_5': this.handleOHLCV,
            'candles_minute_10': this.handleOHLCV,
            'candles_minute_15': this.handleOHLCV,
            'candles_minute_30': this.handleOHLCV,
            'candles_hour_1': this.handleOHLCV,
            'candles_hour_2': this.handleOHLCV,
            'candles_hour_4': this.handleOHLCV,
            'candles_hour_6': this.handleOHLCV,
            'candles_hour_12': this.handleOHLCV,
            'candles_day_1': this.handleOHLCV,
            'candles_day_3': this.handleOHLCV,
            'candles_week_1': this.handleOHLCV,
            'candles_month_1': this.handleOHLCV,
            'book': this.handleOrderBook,
            'book_lv2': this.handleOrderBook,
            'ticker': this.handleTicker,
            'trades': this.handleTrade,
            'orders': this.handleOrder,
            'balances': this.handleBalance,
            'createOrder': this.handleOrderRequest,
            'cancelOrder': this.handleOrderRequest,
            'cancelAllOrders': this.handleOrderRequest,
            'auth': this.handleAuthenticate,
        };
        const method = this.safeValue (methods, type);
        if (type === 'auth') {
            this.handleAuthenticate (client, message);
        } else if (type === undefined) {
            const data = this.safeValue (message, 'data');
            const item = this.safeValue (data, 0);
            const orderId = this.safeString (item, 'orderId');
            if (orderId === '0') {
                this.handleErrorMessage (client, item);
            } else {
                return this.handleOrderRequest (client, message);
            }
        } else {
            const data = this.safeValue (message, 'data', []);
            const dataLength = data.length;
            if (dataLength > 0) {
                return method.call (this, client, message);
            }
        }
    }

    handleErrorMessage (client: Client, message) {
        //
        //    {
        //        message: 'Invalid channel value ["ordersss"]',
        //        event: 'error'
        //    }
        //
        //    {
        //        "orderId": 0,
        //        "clientOrderId": null,
        //        "message": "Currency trade disabled",
        //        "code": 21352
        //    }
        //
        //    {
        //       "event": "error",
        //       "message": "Platform in maintenance mode"
        //    }
        //
        const event = this.safeString (message, 'event');
        const orderId = this.safeString (message, 'orderId');
        if ((event === 'error') || (orderId === '0')) {
            const error = this.safeString (message, 'message');
            throw new ExchangeError (this.id + ' error: ' + this.json (error));
        }
        return false;
    }

    handleAuthenticate (client: Client, message) {
        //
        //    {
        //        "success": true,
        //        "ret_msg": '',
        //        "op": "auth",
        //        "conn_id": "ce3dpomvha7dha97tvp0-2xh"
        //    }
        //
        const data = this.safeValue (message, 'data');
        const success = this.safeValue (data, 'success');
        const messageHash = 'authenticated';
        if (success) {
            client.resolve (message, messageHash);
        } else {
            const error = new AuthenticationError (this.id + ' ' + this.json (message));
            client.reject (error, messageHash);
            if (messageHash in client.subscriptions) {
                delete client.subscriptions[messageHash];
            }
        }
        return message;
    }

    ping (client) {
        return {
            'event': 'ping',
        };
    }
}

