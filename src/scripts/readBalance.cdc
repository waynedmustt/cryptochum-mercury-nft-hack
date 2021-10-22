pub fun main(address: Address): UFix64 {
    let account = getAccount(address)
    log(account.balance)

    return account.balance
}