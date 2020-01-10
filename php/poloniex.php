<?php

namespace ccxtpro;

// PLEASE DO NOT EDIT THIS FILE, IT IS GENERATED AND WILL BE OVERWRITTEN:
// https://github.com/ccxt/ccxt/blob/master/CONTRIBUTING.md#how-to-contribute-code

use \ccxtpro\ClientTrait; // websocket functionality
use Exception; // a common import

class poloniex extends \ccxt\poloniex {

    use ClientTrait;

    public function describe () {
        return array_replace_recursive(parent::describe (), array(
            'has' => array(
                'ws' => true,
                'watchTicker' => true,
                'watchOrderBook' => true,
            ),
            'urls' => array(
                'api' => array(
                    'ws' => 'wss://api2.poloniex.com',
                ),
            ),
        ));
    }

    public function handle_tickers ($client, $response) {
        $data = $response[2];
        $market = $this->safe_value($this->options['marketsByNumericId'], (string) $data[0]);
        $symbol = $this->safe_string($market, 'symbol');
        return array(
            'info' => $response,
            'symbol' => $symbol,
            'last' => floatval ($data[1]),
            'ask' => floatval ($data[2]),
            'bid' => floatval ($data[3]),
            'change' => floatval ($data[4]),
            'baseVolume' => floatval ($data[5]),
            'quoteVolume' => floatval ($data[6]),
            'active' => $data[7] ? false : true,
            'high' => floatval ($data[8]),
            'low' => floatval ($data[9]),
        );
    }

    public function watch_balance ($params = array ()) {
        $this->load_markets();
        $this->balance = $this->fetchBalance ($params);
        $channelId = '1000';
        $subscribe = array(
            'command' => 'subscribe',
            'channel' => $channelId,
        );
        $messageHash = $channelId . ':b:e';
        $url = $this->urls['api']['ws'];
        return $this->watch ($url, $messageHash, $subscribe, $channelId);
    }

    public function watch_tickers ($symbols = null, $params = array ()) {
        $this->load_markets();
        // rewrite
        throw new NotImplemented($this->id . 'watchTickers not implemented yet');
        // $market = $this->market (symbol);
        // $numericId = (string) $market['info']['id'];
        // $url = $this->urls['api']['websocket']['public'];
        // return $this->WsTickerMessage ($url, '1002' . $numericId, array(
        //     'command' => 'subscribe',
        //     'channel' => 1002,
        // ));
    }

    public function load_markets ($reload = false, $params = array ()) {
        $markets = parent::load_markets($reload, $params);
        $marketsByNumericId = $this->safe_value($this->options, 'marketsByNumericId');
        if (($marketsByNumericId === null) || $reload) {
            $marketsByNumericId = array();
            for ($i = 0; $i < count($this->symbols); $i++) {
                $symbol = $this->symbols[$i];
                $market = $this->markets[$symbol];
                $numericId = $this->safe_string($market, 'numericId');
                $marketsByNumericId[$numericId] = $market;
            }
            $this->options['marketsByNumericId'] = $marketsByNumericId;
        }
        return $markets;
    }

    public function watch_trades ($symbol, $params = array ()) {
        $this->load_markets();
        $market = $this->market ($symbol);
        $numericId = $this->safe_string($market, 'numericId');
        $messageHash = 'trades:' . $numericId;
        $url = $this->urls['api']['ws'];
        $subscribe = array(
            'command' => 'subscribe',
            'channel' => $numericId,
        );
        return $this->watch ($url, $messageHash, $subscribe, $numericId);
    }

    public function watch_order_book ($symbol, $limit = null, $params = array ()) {
        $this->load_markets();
        $market = $this->market ($symbol);
        $numericId = $this->safe_string($market, 'numericId');
        $messageHash = 'orderbook:' . $numericId;
        $url = $this->urls['api']['ws'];
        $subscribe = array(
            'command' => 'subscribe',
            'channel' => $numericId,
        );
        $future = $this->watch ($url, $messageHash, $subscribe, $numericId);
        return $this->after ($future, array($this, 'limit_order_book'), $symbol, $limit, $params);
    }

    public function limit_order_book ($orderbook, $symbol, $limit = null, $params = array ()) {
        return $orderbook->limit ($limit);
    }

    public function watch_heartbeat ($params = array ()) {
        $this->load_markets();
        $channelId = '1010';
        $url = $this->urls['api']['ws'];
        return $this->watch ($url, $channelId);
    }

    public function sign_message ($client, $messageHash, $message, $params = array ()) {
        if (mb_strpos($messageHash, '1000') === 0) {
            $throwOnError = false;
            if ($this->check_required_credentials($throwOnError)) {
                $nonce = $this->nonce ();
                $payload = $this->urlencode (array( 'nonce' => $nonce ));
                $signature = $this->hmac ($this->encode ($payload), $this->encode ($this->secret), 'sha512');
                $message = array_merge($message, array(
                    'key' => $this->apiKey,
                    'payload' => $payload,
                    'sign' => $signature,
                ));
            }
        }
        return $message;
    }

    public function handle_heartbeat ($client, $message) {
        //
        // every second (approx) if no other updates are sent
        //
        //     array( 1010 )
        //
        $channelId = '1010';
        $client->resolve ($message, $channelId);
    }

    public function handle_trade ($client, $trade, $market = null) {
        //
        // public trades
        //
        //     array(
        //         "t", // $trade
        //         "42706057", // $id
        //         1, // 1 = buy, 0 = sell
        //         "0.05567134", // $price
        //         "0.00181421", // $amount
        //         1522877119, // $timestamp
        //     )
        //
        $id = (string) $trade[1];
        $side = $trade[2] ? 'buy' : 'sell';
        $price = floatval ($trade[3]);
        $amount = floatval ($trade[4]);
        $timestamp = $trade[5] * 1000;
        $symbol = null;
        if ($market !== null) {
            $symbol = $market['symbol'];
        }
        return array(
            'info' => $trade,
            'timestamp' => $timestamp,
            'datetime' => $this->iso8601 ($timestamp),
            'symbol' => $symbol,
            'id' => $id,
            'order' => null,
            'type' => null,
            'takerOrMaker' => null,
            'side' => $side,
            'price' => $price,
            'amount' => $amount,
            'cost' => $price * $amount,
            'fee' => null,
        );
    }

    public function handle_order_book_and_trades ($client, $message) {
        //
        // first response
        //
        //     [
        //         14, // channelId === $market['numericId']
        //         8767, // $nonce
        //         array(
        //             array(
        //                 "$i", // initial $snapshot
        //                 {
        //                     "currencyPair" => "BTC_BTS",
        //                     "orderBook" => array(
        //                         array( "0.00001853" => "2537.5637", "0.00001854" => "1567238.172367" ), // asks, $price, size
        //                         array( "0.00001841" => "3645.3647", "0.00001840" => "1637.3647" ) // bids
        //                     )
        //                 }
        //             )
        //         )
        //     ]
        //
        // subsequent updates
        //
        //     array(
        //         14,
        //         8768,
        //         array(
        //             array( "o", 1, "0.00001823", "5534.6474" ), // $orderbook $delta, bids, $price, size
        //             array( "o", 0, "0.00001824", "6575.464" ), // $orderbook $delta, asks, $price, size
        //             array( "t", "42706057", 1, "0.05567134", "0.00181421", 1522877119 ) // $trade, id, $side (1 for buy, 0 for sell), $price, size, timestamp
        //         )
        //     )
        //
        $marketId = (string) $message[0];
        $nonce = $message[1];
        $data = $message[2];
        $market = $this->safe_value($this->options['marketsByNumericId'], $marketId);
        $symbol = $this->safe_string($market, 'symbol');
        $orderbookUpdatesCount = 0;
        $tradesCount = 0;
        for ($i = 0; $i < count($data); $i++) {
            $delta = $data[$i];
            if ($delta[0] === 'i') {
                $snapshot = $this->safe_value($delta[1], 'orderBook', array());
                $sides = array( 'asks', 'bids' );
                $this->orderbooks[$symbol] = $this->order_book();
                $orderbook = $this->orderbooks[$symbol];
                for ($j = 0; $j < count($snapshot); $j++) {
                    $side = $sides[$j];
                    $bookside = $orderbook[$side];
                    $orders = $snapshot[$j];
                    $prices = is_array($orders) ? array_keys($orders) : array();
                    for ($k = 0; $k < count($prices); $k++) {
                        $price = $prices[$k];
                        $amount = $orders[$price];
                        $bookside->store (floatval ($price), floatval ($amount));
                    }
                }
                $orderbook['nonce'] = $nonce;
                $orderbookUpdatesCount .= 1;
            } else if ($delta[0] === 'o') {
                $orderbook = $this->orderbooks[$symbol];
                $side = $delta[1] ? 'bids' : 'asks';
                $bookside = $orderbook[$side];
                $price = floatval ($delta[2]);
                $amount = floatval ($delta[3]);
                $bookside->store ($price, $amount);
                $orderbookUpdatesCount .= 1;
            } else if ($delta[0] === 't') {
                // todo => add max limit to the dequeue of trades, unshift and push
                // $trade = $this->handle_trade ($client, $delta, $market);
                // $this->trades[] = $trade;
                $tradesCount .= 1;
            }
        }
        if ($orderbookUpdatesCount) {
            // resolve the $orderbook future
            $messageHash = 'orderbook:' . $marketId;
            $orderbook = $this->orderbooks[$symbol];
            // the .limit () operation will be moved to the watchOrderBook
            $client->resolve ($orderbook, $messageHash);
        }
        if ($tradesCount) {
            // resolve the trades future
            $messageHash = 'trades:' . $marketId;
            // todo => incremental trades
            $client->resolve ($this->trades, $messageHash);
        }
    }

    public function handle_account_notifications ($client, $message) {
        // not implemented yet
        // throw new NotImplemented($this->id . 'watchTickers not implemented yet');
        return $message;
    }

    public function handle_message ($client, $message) {
        $channelId = $this->safe_string($message, 0);
        $market = $this->safe_value($this->options['marketsByNumericId'], $channelId);
        if ($market === null) {
            $methods = array(
                // '<numericId>' => 'handleOrderBookAndTrades', // Price Aggregated Book
                '1000' => array($this, 'handle_account_notifications'), // Beta
                '1002' => array($this, 'handle_tickers'), // Ticker Data
                // '1003' => null, // 24 Hour Exchange Volume
                '1010' => array($this, 'handle_heartbeat'),
            );
            $method = $this->safe_value($methods, $channelId);
            if ($method === null) {
                return $message;
            } else {
                $method->apply (this, $client, $message);
            }
        } else {
            return $this->handle_order_book_and_trades ($client, $message);
        }
    }
}
