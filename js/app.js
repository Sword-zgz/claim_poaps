let allEvents = [];
let hasPoapClaimed = false;
let hasPoapClaimedDisplayed = false;
let hasRaffleDisplayed = false;
function getAllDeliveries() {
    return new Promise((resolve) => {
        allEvents = [];
        axios.get('https://frontend.poap.tech/deliveries?limit=1000&offset=0').then(res => {
            let events = [];
            for (let event of res.data.deliveries) {
                events.push(event);
                allEvents.push(event.id);
            }
            resolve(events)
        }).catch(err => {
            resolve([])
        })
    })
}

function isValidDelivery(slug) {
    return new Promise((resolve) => {
        axios.get(`https://anyplace-cors.herokuapp.com/https://poap.delivery/${slug}`).then(res => {
            resolve(true)
        }).catch(err => {
            resolve(false);
        })
    })
}

function getAllRaffles(poaps, raffles = [], api = 'https://api-ro.poap.fun/api/v1/raffles/') {
    return new Promise((resolve, reject) => {
        axios.get(api).then(res => {
            let page = res.data.next;
            if (page) {
                console.log(page)
                let results = res.data.results;
                for (let result of results) {
                    let current = new Date();
                    let drawTime = new Date(result.draw_datetime);
                    if (current < drawTime) {
                        for (let event of result.events) {
                            if (poaps.includes(event.event_id)) {
                                displayRaffle(result);
                                hasRaffleDisplayed = true;
                                break;
                            }
                        }
                    }
                }
                getAllRaffles(poaps, raffles, page).then(resolve).catch(reject);;
            } else {
                resolve(true);
            }
        }).catch(err => {
            reject(err);
        })
    });
}

function getAllPoaps(address) {
    return new Promise((resolve, reject) => {
        let poapList = [];
        axios.get(`https://api.poap.xyz/actions/scan/${address.toLowerCase()}`).then(async (res) => {
            for (let token of res.data) {
                poapList.push("" + token.event.id)
            }
            resolve(poapList)
        }).catch(err => {
            reject(err);
        });
    });

}

function claim(event, address) {
    return new Promise((resolve) => {
        axios.post(`https://api.poap.xyz/actions/claim-delivery-v2`, {
            address: address,
            id: event.id
        }).then(res => {
            let header = `<div class="row mt-5">
            <div class="col-md-12">
                <div class="title-header text-center">
                    <h5>Your Availabe POAP Deliveries</h5>
                </div>
            </div>
        </div>
        <div class="row" id="deliveries">`;
            if (!hasPoapClaimedDisplayed) {
                $('#deliveriesHeader').html(header);
            }
            document.getElementById('deliveries').innerHTML += `<div class="col-lg-4 col-md-4 col-sm-4 col-xs-12">
                    <div class="box-part text-center">
                    <span class="badge badge-primary">Just Claimed</span>
                        <a href="https://poap.delivery/${event.slug}">
                            <img src="${event.image}" style="width:100px;height:100px;border-radius: 50%;">
                        </a>
                        <div class="title">
                            <h4>${event.card_title}</h4>
                        </div>
                        <div id='${event.id}'></div>
                    </div>
                </div>`
            hasPoapClaimedDisplayed = true;
            resolve(res.data.queue_uid);
        }).catch(err => {
            resolve('');
        })
    });
}

function getQueueIdStatus(event, queueId) {
    return new Promise((resolve) => {
        axios.get(`https://api.poap.xyz/queue-message/${queueId}`).then((res) => {
            let status = res.data.status;
            if (status == 'FINISH') {
                let transactionId = res.data.result.tx_hash;
                $(`#${event.id}`).html(`<a href='https://blockscout.com/xdai/mainnet/tx/${transactionId}' target="_blank" class="btn btn-success">CLAIMED</a>`);
                resolve(true)
            } else {
                $(`#${event.id}`).html(`<a href='https://poap.delivery/${event.slug}' target="_blank" class="btn btn-warning">${status}</a>`);
                resolve(false)
            }
        }).catch(err => {
            resolve(true)
        })
    });
}

function displayRaffle(raffle) {
    let header = `
    <div class="row mt-5">
        <div class="col-md-12">
            <div class="title-header text-center">
                <h5>Your POAP Raffle Tickets</h5>
            </div>
        </div>
    </div>
    <div class="row" id="raffleCards"></div>`;
    if (!hasRaffleDisplayed) {
        $('#raffles').html(header);
    }
    document.getElementById('raffleCards').innerHTML += `<div class="col-lg-4 col-md-4 col-sm-4 col-xs-12">
        <div class="box-part text-center">
            <a href="https://poap.fun/raffle/${raffle.id}">
                <img src="https://cdn.pixabay.com/photo/2014/04/02/14/04/ticket-306087_960_720.png" style="width:100px;height:100px;border-radius: 50%;">
            </a>
            <div class="title">
                <h4>${raffle.name}</h4>
            </div>
            <a href='https://poap.fun/raffle/${raffle.id}' target="_blank" class="btn btn-success">Join</a>
        </div>
    </div>`;
}

function getMyDeliveries(event, address) {
    axios.get(`https://api.poap.xyz/delivery-addresses/${event.id}/address/${address}`).then(async (res) => {
        let isClaimed = res.data.claimed;
        allEvents = allEvents.filter(item => item != event.id);
        $('#checkMsg').html(allEvents.length > 0 ? `<p>${allEvents.length} Deliveries Remaining to Check...</p>` : '');
        if (!isClaimed) {
            let isValid = await isValidDelivery(event.slug);
            if (isValid) {
                let queueId = await claim(event, res.data.address);
                await getQueueIdStatus(event, queueId);
                const status = setInterval(async function checkStatus() {
                    let isCompleted = await getQueueIdStatus(event, queueId);
                    if (isCompleted) {
                        clearInterval(status);
                    }
                }, 3000);
            }
        }
        else {
            if (!hasPoapClaimed) {
                $('#claimed').html(`<div class="row mt-5">
                 <div class="col-md-12">
                     <div class="title-header text-center">
                         <h5>Your Claimed POAP Deliveries</h5>
                     </div>
                 </div>
             </div>
             <div class="row" id="claimedDeliveries"></div>`)
            }
            document.getElementById('claimedDeliveries').innerHTML += `<div class="col-lg-4 col-md-4 col-sm-4 col-xs-12" style="opacity:0.5">
                    <div class="box-part text-center">
                    <span class="badge badge-primary">claimed</span>
                        <a href="https://poap.delivery/${event.slug}">
                            <img src="${event.image}" style="width:100px;height:100px;border-radius: 50%;">
                        </a>
                        <div class="title">
                            <h4>${event.card_title}</h4>
                        </div>
                        <div id='${event.id}'></div>
                    </div>
                </div>`;
            hasPoapClaimed = true;
        }
    }).catch(err => {
        allEvents = allEvents.filter(item => item != event.id);
        $('#checkMsg').html(allEvents.length > 0 ? `<p>${allEvents.length} Deliveries Remaining to Check...</p>` : '');
    })
}

async function startRaffles(address) {
    let poaps = await getAllPoaps(address);
    await getAllRaffles(poaps);
}
async function startDeliveries(address) {
    let events = await getAllDeliveries();
    for (let event of events) {
        getMyDeliveries(event, address);
    }
}

$(document).ready(function () {
    $('#claimButton').submit(async function (e) {
        e.preventDefault();
        let address = $('#address').val().toLowerCase().trim();
        if (!address) {
            alert("Please Enter Ethereum Address or ENS Name!");
            $("#address").focus();
            return;
        }
        $('#deliveriesHeader').html('');
        $('#claimed').html('');
        $('#raffles').html('');
        $('#checkMsg').html(`<p>Checking...</p>`);
        startRaffles(address);
        startDeliveries(address);
    });
});