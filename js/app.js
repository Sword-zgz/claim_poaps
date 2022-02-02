let allEvents = [];

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

function claim(event, address) {
    return new Promise((resolve) => {
        axios.post(`https://api.poap.xyz/actions/claim-delivery-v2`, {
            address: address,
            id: event.id
        }).then(res => {
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

function getMyDeliveries(event, address) {
    axios.get(`https://api.poap.xyz/delivery-addresses/${event.id}/address/${address}`).then(async(res) => {
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
    }).catch(err => {
        allEvents = allEvents.filter(item => item != event.id);
        $('#checkMsg').html(allEvents.length > 0 ? `<p>${allEvents.length} Deliveries Remaining to Check...</p>` : '');
    })
}

$(document).ready(function() {
    $('#claimButton').submit(async function(e) {
        e.preventDefault();
        let address = $('#address').val().toLowerCase().trim();
        if (!address) {
            alert("Please Enter Ethereum Address or ENS Name!");
            $("#address").focus();
            return;
        }
        $('#deliveries').html('');
        let events = await getAllDeliveries();
        for (let event of events) {
            getMyDeliveries(event, address);
        }
    });
});