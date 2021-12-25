# -*- coding: utf-8 -*-

# PLEASE DO NOT EDIT THIS FILE, IT IS GENERATED AND WILL BE OVERWRITTEN:
# https://github.com/ccxt/ccxt/blob/master/CONTRIBUTING.md#how-to-contribute-code

from ccxt.base.exchange import Exchange
from ccxt.base.errors import ExchangeError
from ccxt.base.errors import ArgumentsRequired
from ccxt.base.precise import Precise


class btctradeua(Exchange):

    def describe(self):
        return self.deep_extend(super(btctradeua, self).describe(), {
            'id': 'btctradeua',
            'name': 'BTC Trade UA',
            'countries': ['UA'],  # Ukraine,
            'rateLimit': 3000,
            'has': {
                'cancelOrder': True,
                'CORS': None,
                'createMarketOrder': None,
                'createOrder': True,
                'fetchBalance': True,
                'fetchOpenOrders': True,
                'fetchOrderBook': True,
                'fetchTicker': True,
                'fetchTrades': True,
                'signIn': True,
            },
            'urls': {
                'referral': 'https://btc-trade.com.ua/registration/22689',
                'logo': 'https://user-images.githubusercontent.com/1294454/27941483-79fc7350-62d9-11e7-9f61-ac47f28fcd96.jpg',
                'api': 'https://btc-trade.com.ua/api',
                'www': 'https://btc-trade.com.ua',
                'doc': 'https://docs.google.com/document/d/1ocYA0yMy_RXd561sfG3qEPZ80kyll36HUxvCRe5GbhE/edit',
            },
            'api': {
                'public': {
                    'get': [
                        'deals/{symbol}',
                        'trades/sell/{symbol}',
                        'trades/buy/{symbol}',
                        'japan_stat/high/{symbol}',
                    ],
                },
                'private': {
                    'post': [
                        'auth',
                        'ask/{symbol}',
                        'balance',
                        'bid/{symbol}',
                        'buy/{symbol}',
                        'my_orders/{symbol}',
                        'order/status/{id}',
                        'remove/order/{id}',
                        'sell/{symbol}',
                    ],
                },
            },
            'markets': {
                'BCH/UAH': {'id': 'bch_uah', 'symbol': 'BCH/UAH', 'base': 'BCH', 'quote': 'UAH', 'baseId': 'bch', 'quoteId': 'uah', 'type': 'spot', 'spot': True},
                'BTC/UAH': {'id': 'btc_uah', 'symbol': 'BTC/UAH', 'base': 'BTC', 'quote': 'UAH', 'baseId': 'btc', 'quoteId': 'uah', 'precision': {'price': 1}, 'limits': {'amount': {'min': 0.0000000001}}, 'type': 'spot', 'spot': True},
                'DASH/BTC': {'id': 'dash_btc', 'symbol': 'DASH/BTC', 'base': 'DASH', 'quote': 'BTC', 'baseId': 'dash', 'quoteId': 'btc', 'type': 'spot', 'spot': True},
                'DASH/UAH': {'id': 'dash_uah', 'symbol': 'DASH/UAH', 'base': 'DASH', 'quote': 'UAH', 'baseId': 'dash', 'quoteId': 'uah', 'type': 'spot', 'spot': True},
                'DOGE/BTC': {'id': 'doge_btc', 'symbol': 'DOGE/BTC', 'base': 'DOGE', 'quote': 'BTC', 'baseId': 'doge', 'quoteId': 'btc', 'type': 'spot', 'spot': True},
                'DOGE/UAH': {'id': 'doge_uah', 'symbol': 'DOGE/UAH', 'base': 'DOGE', 'quote': 'UAH', 'baseId': 'doge', 'quoteId': 'uah', 'type': 'spot', 'spot': True},
                'ETH/UAH': {'id': 'eth_uah', 'symbol': 'ETH/UAH', 'base': 'ETH', 'quote': 'UAH', 'baseId': 'eth', 'quoteId': 'uah', 'type': 'spot', 'spot': True},
                'ITI/UAH': {'id': 'iti_uah', 'symbol': 'ITI/UAH', 'base': 'ITI', 'quote': 'UAH', 'baseId': 'iti', 'quoteId': 'uah', 'type': 'spot', 'spot': True},
                'KRB/UAH': {'id': 'krb_uah', 'symbol': 'KRB/UAH', 'base': 'KRB', 'quote': 'UAH', 'baseId': 'krb', 'quoteId': 'uah', 'type': 'spot', 'spot': True},
                'LTC/BTC': {'id': 'ltc_btc', 'symbol': 'LTC/BTC', 'base': 'LTC', 'quote': 'BTC', 'baseId': 'ltc', 'quoteId': 'btc', 'type': 'spot', 'spot': True},
                'LTC/UAH': {'id': 'ltc_uah', 'symbol': 'LTC/UAH', 'base': 'LTC', 'quote': 'UAH', 'baseId': 'ltc', 'quoteId': 'uah', 'type': 'spot', 'spot': True},
                'NVC/BTC': {'id': 'nvc_btc', 'symbol': 'NVC/BTC', 'base': 'NVC', 'quote': 'BTC', 'baseId': 'nvc', 'quoteId': 'btc', 'type': 'spot', 'spot': True},
                'NVC/UAH': {'id': 'nvc_uah', 'symbol': 'NVC/UAH', 'base': 'NVC', 'quote': 'UAH', 'baseId': 'nvc', 'quoteId': 'uah', 'type': 'spot', 'spot': True},
                'PPC/BTC': {'id': 'ppc_btc', 'symbol': 'PPC/BTC', 'base': 'PPC', 'quote': 'BTC', 'baseId': 'ppc', 'quoteId': 'btc', 'type': 'spot', 'spot': True},
                'SIB/UAH': {'id': 'sib_uah', 'symbol': 'SIB/UAH', 'base': 'SIB', 'quote': 'UAH', 'baseId': 'sib', 'quoteId': 'uah', 'type': 'spot', 'spot': True},
                'XMR/UAH': {'id': 'xmr_uah', 'symbol': 'XMR/UAH', 'base': 'XMR', 'quote': 'UAH', 'baseId': 'xmr', 'quoteId': 'uah', 'type': 'spot', 'spot': True},
                'ZEC/UAH': {'id': 'zec_uah', 'symbol': 'ZEC/UAH', 'base': 'ZEC', 'quote': 'UAH', 'baseId': 'zec', 'quoteId': 'uah', 'type': 'spot', 'spot': True},
            },
            'fees': {
                'trading': {
                    'maker': 0.1 / 100,
                    'taker': 0.1 / 100,
                },
                'funding': {
                    'withdraw': {
                        'BTC': 0.0006,
                        'LTC': 0.01,
                        'NVC': 0.01,
                        'DOGE': 10,
                    },
                },
            },
        })

    def sign_in(self, params={}):
        return self.privatePostAuth(params)

    def fetch_balance(self, params={}):
        self.load_markets()
        response = self.privatePostBalance(params)
        result = {'info': response}
        balances = self.safe_value(response, 'accounts')
        for i in range(0, len(balances)):
            balance = balances[i]
            currencyId = self.safe_string(balance, 'currency')
            code = self.safe_currency_code(currencyId)
            account = self.account()
            account['total'] = self.safe_string(balance, 'balance')
            result[code] = account
        return self.safe_balance(result)

    def fetch_order_book(self, symbol, limit=None, params={}):
        self.load_markets()
        market = self.market(symbol)
        request = {
            'symbol': market['id'],
        }
        bids = self.publicGetTradesBuySymbol(self.extend(request, params))
        asks = self.publicGetTradesSellSymbol(self.extend(request, params))
        orderbook = {
            'bids': [],
            'asks': [],
        }
        if bids:
            if 'list' in bids:
                orderbook['bids'] = bids['list']
        if asks:
            if 'list' in asks:
                orderbook['asks'] = asks['list']
        return self.parse_order_book(orderbook, symbol, None, 'bids', 'asks', 'price', 'currency_trade')

    def fetch_ticker(self, symbol, params={}):
        self.load_markets()
        request = {
            'symbol': self.market_id(symbol),
        }
        response = self.publicGetJapanStatHighSymbol(self.extend(request, params))
        ticker = self.safe_value(response, 'trades')
        timestamp = self.milliseconds()
        result = {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': self.iso8601(timestamp),
            'high': None,
            'low': None,
            'bid': None,
            'bidVolume': None,
            'ask': None,
            'askVolume': None,
            'vwap': None,
            'open': None,
            'close': None,
            'last': None,
            'previousClose': None,
            'change': None,
            'percentage': None,
            'average': None,
            'baseVolume': None,
            'quoteVolume': None,
            'info': ticker,
        }
        tickerLength = len(ticker)
        if tickerLength > 0:
            start = max(tickerLength - 48, 0)
            for i in range(start, len(ticker)):
                candle = ticker[i]
                if result['open'] is None:
                    result['open'] = self.safe_number(candle, 1)
                high = self.safe_number(candle, 2)
                if (result['high'] is None) or ((high is not None) and (result['high'] < high)):
                    result['high'] = high
                low = self.safe_number(candle, 3)
                if (result['low'] is None) or ((low is not None) and (result['low'] > low)):
                    result['low'] = low
                baseVolume = self.safe_number(candle, 5)
                if result['baseVolume'] is None:
                    result['baseVolume'] = baseVolume
                else:
                    result['baseVolume'] = self.sum(result['baseVolume'], baseVolume)
            last = tickerLength - 1
            result['last'] = self.safe_number(ticker[last], 4)
            result['close'] = result['last']
        return result

    def convert_month_name_to_string(self, cyrillic):
        months = {
            'Jan': '01',
            'Feb': '02',
            'Mar': '03',
            'Apr': '04',
            'May': '05',
            'Jun': '06',
            'Jul': '07',
            'Aug': '08',
            'Sept': '09',
            'Oct': '10',
            'Nov': '11',
            'Dec': '12',
        }
        return self.safe_string(months, cyrillic)

    def parse_exchange_specific_datetime(self, cyrillic):
        parts = cyrillic.split(' ')
        month = parts[0]
        day = parts[1].replace(',', '')
        if len(day) < 2:
            day = '0' + day
        year = parts[2].replace(',', '')
        month = month.replace(',', '')
        month = month.replace('.', '')
        month = self.convert_month_name_to_string(month)
        if not month:
            raise ExchangeError(self.id + ' parseTrade() unrecognized month name: ' + cyrillic)
        hms = parts[3]
        hmsParts = hms.split(':')
        h = self.safe_string(hmsParts, 0)
        m = '00'
        ampm = self.safe_string(parts, 4)
        if h == 'noon':
            h = '12'
        else:
            intH = int(h)
            if (ampm is not None) and (ampm[0] == 'p'):
                intH = 12 + intH
                if intH > 23:
                    intH = 0
            h = str(intH)
            if len(h) < 2:
                h = '0' + h
            m = self.safe_string(hmsParts, 1, '00')
            if len(m) < 2:
                m = '0' + m
        ymd = '-'.join([year, month, day])
        ymdhms = ymd + 'T' + h + ':' + m + ':00'
        timestamp = self.parse8601(ymdhms)
        # server reports local time, adjust to UTC
        # a special case for DST
        # subtract 2 hours during winter
        intM = int(m)
        if intM < 11 or intM > 2:
            return timestamp - 7200000
        # subtract 3 hours during summer
        return timestamp - 10800000

    def parse_trade(self, trade, market=None):
        timestamp = self.parse_exchange_specific_datetime(self.safe_string(trade, 'pub_date'))
        id = self.safe_string(trade, 'id')
        type = 'limit'
        side = self.safe_string(trade, 'type')
        priceString = self.safe_string(trade, 'price')
        amountString = self.safe_string(trade, 'amnt_trade')
        price = self.parse_number(priceString)
        amount = self.parse_number(amountString)
        cost = self.parse_number(Precise.string_mul(priceString, amountString))
        symbol = None
        if market is not None:
            symbol = market['symbol']
        return {
            'id': id,
            'info': trade,
            'timestamp': timestamp,
            'datetime': self.iso8601(timestamp),
            'symbol': symbol,
            'type': type,
            'side': side,
            'order': None,
            'takerOrMaker': None,
            'price': price,
            'amount': amount,
            'cost': cost,
            'fee': None,
        }

    def fetch_trades(self, symbol, since=None, limit=None, params={}):
        self.load_markets()
        market = self.market(symbol)
        request = {
            'symbol': market['id'],
        }
        response = self.publicGetDealsSymbol(self.extend(request, params))
        # they report each trade twice(once for both of the two sides of the fill)
        # deduplicate trades for that reason
        trades = []
        for i in range(0, len(response)):
            id = self.safe_integer(response[i], 'id')
            if id % 2:
                trades.append(response[i])
        return self.parse_trades(trades, market, since, limit)

    def create_order(self, symbol, type, side, amount, price=None, params={}):
        if type == 'market':
            raise ExchangeError(self.id + ' allows limit orders only')
        self.load_markets()
        market = self.market(symbol)
        method = 'privatePost' + self.capitalize(side) + 'Id'
        request = {
            'count': amount,
            'currency1': market['quoteId'],
            'currency': market['baseId'],
            'price': price,
        }
        return getattr(self, method)(self.extend(request, params))

    def cancel_order(self, id, symbol=None, params={}):
        request = {
            'id': id,
        }
        return self.privatePostRemoveOrderId(self.extend(request, params))

    def parse_order(self, order, market=None):
        timestamp = self.milliseconds()
        symbol = self.safe_symbol(None, market)
        side = self.safe_string(order, 'type')
        price = self.safe_string(order, 'price')
        amount = self.safe_string(order, 'amnt_trade')
        remaining = self.safe_string(order, 'amnt_trade')
        return self.safe_order({
            'id': self.safe_string(order, 'id'),
            'clientOrderId': None,
            'timestamp': timestamp,  # until they fix their timestamp
            'datetime': self.iso8601(timestamp),
            'lastTradeTimestamp': None,
            'status': 'open',
            'symbol': symbol,
            'type': None,
            'timeInForce': None,
            'postOnly': None,
            'side': side,
            'price': price,
            'stopPrice': None,
            'amount': amount,
            'filled': None,
            'remaining': remaining,
            'trades': None,
            'info': order,
            'cost': None,
            'average': None,
            'fee': None,
        }, market)

    def fetch_open_orders(self, symbol=None, since=None, limit=None, params={}):
        if symbol is None:
            raise ArgumentsRequired(self.id + ' fetchOpenOrders() requires a symbol argument')
        self.load_markets()
        market = self.market(symbol)
        request = {
            'symbol': market['id'],
        }
        response = self.privatePostMyOrdersSymbol(self.extend(request, params))
        orders = self.safe_value(response, 'your_open_orders')
        return self.parse_orders(orders, market, since, limit)

    def nonce(self):
        return self.milliseconds()

    def sign(self, path, api='public', method='GET', params={}, headers=None, body=None):
        url = self.urls['api'] + '/' + self.implode_params(path, params)
        query = self.omit(params, self.extract_params(path))
        if api == 'public':
            if query:
                url += self.implode_params(path, query)
        else:
            self.check_required_credentials()
            nonce = self.nonce()
            body = self.urlencode(self.extend({
                'out_order_id': nonce,
                'nonce': nonce,
            }, query))
            auth = body + self.secret
            headers = {
                'public-key': self.apiKey,
                'api-sign': self.hash(self.encode(auth), 'sha256'),
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        return {'url': url, 'method': method, 'body': body, 'headers': headers}
